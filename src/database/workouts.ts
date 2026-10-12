import type { WorkoutSession } from "@/types/sessions";
import * as SQLite from "expo-sqlite";

const dbPromise = SQLite.openDatabaseAsync("gympilot.db");

export async function initializeWorkoutDatabase() {
  const db = await dbPromise;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      template_id TEXT,
      name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      session_id TEXT NOT NULL,
      exercise_index INTEGER NOT NULL,
      exercise_id TEXT NOT NULL,
      name TEXT NOT NULL,
      PRIMARY KEY (session_id, exercise_index)
    );

    CREATE TABLE IF NOT EXISTS workout_sets (
      session_id TEXT NOT NULL,
      exercise_index INTEGER NOT NULL,
      set_index INTEGER NOT NULL,
      set_id TEXT NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      completed INTEGER NOT NULL,
      PRIMARY KEY (session_id, exercise_index, set_index)
    );
  `);
}

export async function saveWorkoutSession(session: WorkoutSession) {
  await initializeWorkoutDatabase();
  const db = await dbPromise;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO workout_sessions
       (id, template_id, name, started_at, finished_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        session.id,
        session.templateId,
        session.name,
        session.startedAt,
        session.finishedAt,
      ],
    );

    for (
      let exerciseIndex = 0;
      exerciseIndex < session.exercises.length;
      exerciseIndex++
    ) {
      const exercise = session.exercises[exerciseIndex];

      await db.runAsync(
        `INSERT INTO workout_exercises
         (session_id, exercise_index, exercise_id, name)
         VALUES (?, ?, ?, ?)`,
        [session.id, exerciseIndex, exercise.id, exercise.name],
      );

      for (let setIndex = 0; setIndex < exercise.sets.length; setIndex++) {
        const set = exercise.sets[setIndex];

        await db.runAsync(
          `INSERT INTO workout_sets
           (session_id, exercise_index, set_index,
            set_id, weight, reps, completed)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            session.id,
            exerciseIndex,
            setIndex,
            set.id,
            set.weight,
            set.reps,
            set.completed ? 1 : 0,
          ],
        );
      }
    }
  });
}

type SessionRow = {
  id: string;
  template_id: string | null;
  name: string;
  started_at: string;
  finished_at: string;
};

type ExerciseRow = {
  session_id: string;
  exercise_index: number;
  exercise_id: string;
  name: string;
};

type SetRow = {
  session_id: string;
  exercise_index: number;
  set_index: number;
  set_id: string;
  weight: number;
  reps: number;
  completed: number;
};

export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  await initializeWorkoutDatabase();
  const db = await dbPromise;

  const sessions = await db.getAllAsync<SessionRow>(
    `SELECT * FROM workout_sessions
     ORDER BY finished_at DESC`,
  );

  const exercises = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM workout_exercises
     ORDER BY session_id, exercise_index`,
  );

  const sets = await db.getAllAsync<SetRow>(
    `SELECT * FROM workout_sets
     ORDER BY session_id, exercise_index, set_index`,
  );

  return sessions.map((session) => ({
    id: session.id,
    templateId: session.template_id,
    name: session.name,
    startedAt: session.started_at,
    finishedAt: session.finished_at,
    exercises: exercises
      .filter((e) => e.session_id === session.id)
      .map((exercise) => ({
        id: exercise.exercise_id,
        name: exercise.name,
        sets: sets
          .filter(
            (set) =>
              set.session_id === session.id &&
              set.exercise_index === exercise.exercise_index,
          )
          .map((set) => ({
            id: set.set_id,
            weight: set.weight,
            reps: set.reps,
            completed: set.completed === 1,
          })),
      })),
  }));
}

export async function getWorkoutSession(id: string) {
  const sessions = await getWorkoutSessions();
  return sessions.find((session) => session.id === id);
}
