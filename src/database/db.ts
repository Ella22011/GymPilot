import * as SQLite from "expo-sqlite";

/** The single app database. Workouts and templates share this file. */
export const dbPromise = SQLite.openDatabaseAsync("gympilot.db");
