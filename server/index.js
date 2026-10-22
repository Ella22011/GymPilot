// GymPilot API: workout templates stored in SQLite.
// No npm dependencies: uses Node's built-in http server and node:sqlite (Node 24+).
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PORT = Number(process.env.PORT) || 3000;

// On Azure App Service (Linux) only /home survives restarts and redeploys.
const DB_PATH =
  process.env.DB_PATH ??
  (process.env.WEBSITE_SITE_NAME ? "/home/data/gympilot.db" : "./data/gympilot.db");

const MAX_BODY_BYTES = 100_000;

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    exercises TEXT NOT NULL
  )
`);

const listStmt = db.prepare("SELECT id, name, exercises FROM templates ORDER BY rowid");
const getStmt = db.prepare("SELECT id, name, exercises FROM templates WHERE id = ?");
const upsertStmt = db.prepare(`
  INSERT INTO templates (id, name, exercises) VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, exercises = excluded.exercises
`);
const deleteStmt = db.prepare("DELETE FROM templates WHERE id = ?");

seedIfEmpty();

function seedIfEmpty() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM templates").get();
  if (count > 0) return;

  const exercise = (name, plannedSets, plannedReps) => ({
    id: randomUUID(),
    name,
    plannedSets,
    plannedReps,
  });
  const examples = [
    {
      name: "Push Day",
      exercises: [
        exercise("Bench Press", 4, 8),
        exercise("Overhead Press", 3, 8),
        exercise("Incline Dumbbell Press", 3, 10),
        exercise("Triceps Pushdown", 3, 12),
      ],
    },
    {
      name: "Pull Day",
      exercises: [
        exercise("Deadlift", 3, 5),
        exercise("Pull-Up", 3, 8),
        exercise("Barbell Row", 3, 10),
        exercise("Biceps Curl", 3, 12),
      ],
    },
    {
      name: "Leg Day",
      exercises: [
        exercise("Squat", 4, 6),
        exercise("Romanian Deadlift", 3, 10),
        exercise("Leg Press", 3, 12),
        exercise("Calf Raise", 3, 15),
      ],
    },
  ];
  for (const t of examples) {
    upsertStmt.run(randomUUID(), t.name, JSON.stringify(t.exercises));
  }
}

function rowToTemplate(row) {
  return { id: row.id, name: row.name, exercises: JSON.parse(row.exercises) };
}

/** Returns an error message, or null if the body is a valid template. */
function validateTemplate(body) {
  if (!body || typeof body !== "object") return "Body must be a JSON object";
  if (typeof body.name !== "string" || !body.name.trim()) return "name is required";
  if (!Array.isArray(body.exercises)) return "exercises must be an array";
  for (const e of body.exercises) {
    if (!e || typeof e.id !== "string" || typeof e.name !== "string" || !e.name.trim()) {
      return "Each exercise needs an id and a name";
    }
    if (!Number.isInteger(e.plannedSets) || e.plannedSets < 1) return "plannedSets must be >= 1";
    if (!Number.isInteger(e.plannedReps) || e.plannedReps < 1) return "plannedReps must be >= 1";
  }
  return null;
}

function saveTemplate(id, body) {
  const exercises = body.exercises.map((e) => ({
    id: e.id,
    name: e.name.trim(),
    plannedSets: e.plannedSets,
    plannedReps: e.plannedReps,
  }));
  upsertStmt.run(id, body.name.trim(), JSON.stringify(exercises));
  return rowToTemplate(getStmt.get(id));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, data) {
  if (data === undefined) {
    res.writeHead(status, CORS_HEADERS).end();
    return;
  }
  res
    .writeHead(status, { ...CORS_HEADERS, "Content-Type": "application/json" })
    .end(JSON.stringify(data));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request body too large");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function handle(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");
  const parts = pathname.split("/").filter(Boolean); // e.g. ["api", "templates", "<id>"]

  if (req.method === "OPTIONS") return send(res, 204);

  if (pathname === "/") return send(res, 200, { status: "ok", service: "gympilot-api" });

  if (parts[0] !== "api" || parts[1] !== "templates" || parts.length > 3) {
    throw new HttpError(404, "Not found");
  }
  const id = parts[2] ? decodeURIComponent(parts[2]) : undefined;

  if (!id) {
    if (req.method === "GET") return send(res, 200, listStmt.all().map(rowToTemplate));
    if (req.method === "POST") {
      const body = await readJson(req);
      const error = validateTemplate(body);
      if (error) throw new HttpError(400, error);
      return send(res, 201, saveTemplate(randomUUID(), body));
    }
    throw new HttpError(405, "Method not allowed");
  }

  if (req.method === "GET") {
    const row = getStmt.get(id);
    if (!row) throw new HttpError(404, "Template not found");
    return send(res, 200, rowToTemplate(row));
  }
  // PUT creates or replaces, so the app can choose the id for new templates.
  if (req.method === "PUT") {
    const body = await readJson(req);
    const error = validateTemplate(body);
    if (error) throw new HttpError(400, error);
    return send(res, 200, saveTemplate(id, body));
  }
  if (req.method === "DELETE") {
    const { changes } = deleteStmt.run(id);
    if (changes === 0) throw new HttpError(404, "Template not found");
    return send(res, 204);
  }
  throw new HttpError(405, "Method not allowed");
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error(err);
    send(res, 500, { error: "Internal server error" });
  });
}).listen(PORT, () => {
  console.log(`GymPilot API listening on port ${PORT}, database ${DB_PATH}`);
});
