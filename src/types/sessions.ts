export type LoggedSet = {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
};

export type SessionExercise = {
  id: string;
  name: string;
  sets: LoggedSet[];
};

export type WorkoutSession = {
  id: string;
  templateId: string | null;
  name: string;
  startedAt: string;
  finishedAt: string;
  exercises: SessionExercise[];
};
