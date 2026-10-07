export type TemplateExercise = {
  id: string;
  /** Exercise name, e.g. "Bench Press". Shared across templates so history can be combined later. */
  name: string;
  plannedSets: number;
  plannedReps: number;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
};

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
