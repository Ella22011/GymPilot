import { createId, WorkoutTemplate } from "@/types/workout";

import { dbPromise } from "./db";

let initPromise: Promise<void> | null = null;

/** Creates the template tables and adds the example templates on first launch. */
export function initializeTemplateDatabase() {
  initPromise ??= (async () => {
    const db = await dbPromise;

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_exercises (
        template_id TEXT NOT NULL,
        exercise_index INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        name TEXT NOT NULL,
        planned_sets INTEGER NOT NULL,
        planned_reps INTEGER NOT NULL,
        PRIMARY KEY (template_id, exercise_index)
      );

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);

    // Seed only once, so deleting every template doesn't bring the examples back.
    const seeded = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_meta WHERE key = 'templates_seeded'`,
    );

    if (!seeded) {
      await db.withTransactionAsync(async () => {
        for (const template of exampleTemplates()) {
          await writeTemplate(template);
        }
        await db.runAsync(
          `INSERT INTO app_meta (key, value) VALUES ('templates_seeded', '1')`,
        );
      });
    }
  })().catch((error) => {
    initPromise = null; // allow a retry on the next call
    throw error;
  });

  return initPromise;
}

type TemplateRow = {
  id: string;
  name: string;
  position: number;
};

type TemplateExerciseRow = {
  template_id: string;
  exercise_index: number;
  exercise_id: string;
  name: string;
  planned_sets: number;
  planned_reps: number;
};

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  await initializeTemplateDatabase();
  const db = await dbPromise;

  const templates = await db.getAllAsync<TemplateRow>(
    `SELECT * FROM workout_templates ORDER BY position`,
  );

  const exercises = await db.getAllAsync<TemplateExerciseRow>(
    `SELECT * FROM template_exercises ORDER BY template_id, exercise_index`,
  );

  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    exercises: exercises
      .filter((e) => e.template_id === template.id)
      .map((e) => ({
        id: e.exercise_id,
        name: e.name,
        plannedSets: e.planned_sets,
        plannedReps: e.planned_reps,
      })),
  }));
}

/** Inserts a new template or replaces an existing one (keeping its place in the list). */
export async function saveTemplate(template: WorkoutTemplate) {
  await initializeTemplateDatabase();
  const db = await dbPromise;

  await db.withTransactionAsync(async () => {
    await writeTemplate(template);
  });
}

export async function deleteTemplate(id: string) {
  await initializeTemplateDatabase();
  const db = await dbPromise;

  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM template_exercises WHERE template_id = ?`, [id]);
    await db.runAsync(`DELETE FROM workout_templates WHERE id = ?`, [id]);
  });
}

// Must be called inside a transaction.
async function writeTemplate(template: WorkoutTemplate) {
  const db = await dbPromise;

  const existing = await db.getFirstAsync<{ position: number }>(
    `SELECT position FROM workout_templates WHERE id = ?`,
    [template.id],
  );

  if (existing) {
    await db.runAsync(`UPDATE workout_templates SET name = ? WHERE id = ?`, [
      template.name,
      template.id,
    ]);
  } else {
    const last = await db.getFirstAsync<{ maxPosition: number | null }>(
      `SELECT MAX(position) AS maxPosition FROM workout_templates`,
    );
    await db.runAsync(
      `INSERT INTO workout_templates (id, name, position) VALUES (?, ?, ?)`,
      [template.id, template.name, (last?.maxPosition ?? -1) + 1],
    );
  }

  await db.runAsync(`DELETE FROM template_exercises WHERE template_id = ?`, [
    template.id,
  ]);

  for (let index = 0; index < template.exercises.length; index++) {
    const exercise = template.exercises[index];
    await db.runAsync(
      `INSERT INTO template_exercises
       (template_id, exercise_index, exercise_id, name, planned_sets, planned_reps)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        template.id,
        index,
        exercise.id,
        exercise.name,
        exercise.plannedSets,
        exercise.plannedReps,
      ],
    );
  }
}

function exampleTemplates(): WorkoutTemplate[] {
  const exercise = (name: string, plannedSets: number, plannedReps: number) => ({
    id: createId(),
    name,
    plannedSets,
    plannedReps,
  });

  return [
    {
      id: createId(),
      name: "Push Day",
      exercises: [
        exercise("Bench Press", 4, 8),
        exercise("Overhead Press", 3, 8),
        exercise("Incline Dumbbell Press", 3, 10),
        exercise("Triceps Pushdown", 3, 12),
      ],
    },
    {
      id: createId(),
      name: "Pull Day",
      exercises: [
        exercise("Deadlift", 3, 5),
        exercise("Pull-Up", 3, 8),
        exercise("Barbell Row", 3, 10),
        exercise("Biceps Curl", 3, 12),
      ],
    },
    {
      id: createId(),
      name: "Leg Day",
      exercises: [
        exercise("Squat", 4, 6),
        exercise("Romanian Deadlift", 3, 10),
        exercise("Leg Press", 3, 12),
        exercise("Calf Raise", 3, 15),
      ],
    },
  ];
}
