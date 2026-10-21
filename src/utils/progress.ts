import type { WorkoutSession } from "@/types/sessions";

/** One completed set, flattened out of a session. */
type DoneSet = { weight: number; reps: number };

export type ExerciseSessionResult = {
  sessionId: string;
  date: string;
  /** Heaviest completed set in this session. */
  topWeight: number;
  topReps: number;
  /** Best estimated one-rep max (Epley) in this session. */
  bestE1rm: number;
  volume: number;
  sets: number;
};

export type ExerciseProgress = {
  /** Lower-cased name used to merge the same exercise across templates. */
  key: string;
  name: string;
  /** Oldest first. */
  sessions: ExerciseSessionResult[];
  prWeight: number;
  prReps: number;
  prDate: string;
  bestE1rm: number;
  totalVolume: number;
};

export type WeeklyVolume = {
  weekStart: Date;
  volume: number;
  workouts: number;
};

export type ProgressSummary = {
  totalWorkouts: number;
  workoutsThisWeek: number;
  totalVolume: number;
  totalSets: number;
  weeklyVolume: WeeklyVolume[];
  /** Most trained first. */
  exercises: ExerciseProgress[];
};

export function estimateOneRepMax(weight: number, reps: number) {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Monday 00:00 of the week the date falls in. */
export function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  return result;
}

const completedSets = (sets: { weight: number; reps: number; completed: boolean }[]) =>
  sets.filter((s) => s.completed && s.reps > 0).map<DoneSet>((s) => ({
    weight: s.weight,
    reps: s.reps,
  }));

const setVolume = (sets: DoneSet[]) =>
  sets.reduce((sum, s) => sum + s.weight * s.reps, 0);

export function buildProgressSummary(
  sessions: WorkoutSession[],
  weeksToShow = 8,
  now = new Date(),
): ProgressSummary {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  );

  // Weekly buckets, oldest first, ending with the current week.
  const thisWeek = startOfWeek(now);
  const weeklyVolume: WeeklyVolume[] = Array.from({ length: weeksToShow }, (_, i) => {
    const weekStart = new Date(thisWeek);
    weekStart.setDate(weekStart.getDate() - (weeksToShow - 1 - i) * 7);
    return { weekStart, volume: 0, workouts: 0 };
  });

  const exerciseMap = new Map<string, ExerciseProgress>();
  let totalVolume = 0;
  let totalSets = 0;

  for (const session of ordered) {
    let sessionVolume = 0;

    for (const exercise of session.exercises) {
      const done = completedSets(exercise.sets);
      if (done.length === 0) continue;

      const volume = setVolume(done);
      sessionVolume += volume;
      totalSets += done.length;

      const top = done.reduce((best, s) =>
        s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)
          ? s
          : best,
      );
      const bestE1rm = Math.max(...done.map((s) => estimateOneRepMax(s.weight, s.reps)));

      const key = exerciseKey(exercise.name);
      let progress = exerciseMap.get(key);
      if (!progress) {
        progress = {
          key,
          name: exercise.name.trim(),
          sessions: [],
          prWeight: 0,
          prReps: 0,
          prDate: session.finishedAt,
          bestE1rm: 0,
          totalVolume: 0,
        };
        exerciseMap.set(key, progress);
      }

      progress.sessions.push({
        sessionId: session.id,
        date: session.finishedAt,
        topWeight: top.weight,
        topReps: top.reps,
        bestE1rm,
        volume,
        sets: done.length,
      });
      progress.totalVolume += volume;
      progress.bestE1rm = Math.max(progress.bestE1rm, bestE1rm);

      if (
        top.weight > progress.prWeight ||
        (top.weight === progress.prWeight && top.reps > progress.prReps)
      ) {
        progress.prWeight = top.weight;
        progress.prReps = top.reps;
        progress.prDate = session.finishedAt;
      }
    }

    totalVolume += sessionVolume;

    const week = startOfWeek(new Date(session.finishedAt)).getTime();
    const bucket = weeklyVolume.find((w) => w.weekStart.getTime() === week);
    if (bucket) {
      bucket.volume += sessionVolume;
      bucket.workouts += 1;
    }
  }

  const exercises = [...exerciseMap.values()].sort(
    (a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name),
  );

  return {
    totalWorkouts: sessions.length,
    workoutsThisWeek: weeklyVolume[weeklyVolume.length - 1]?.workouts ?? 0,
    totalVolume,
    totalSets,
    weeklyVolume,
    exercises,
  };
}

/** 62.5 → "62.5", 60 → "60" */
export function formatWeight(kg: number) {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace(/\.0$/, "");
}

/** 850 → "850 kg", 12400 → "12.4 t" */
export function formatVolume(kg: number) {
  if (kg >= 1000) {
    const tonnes = kg / 1000;
    return `${tonnes >= 100 ? Math.round(tonnes) : tonnes.toFixed(1)} t`;
  }
  return `${Math.round(kg)} kg`;
}

/** "21.10." */
export function formatShortDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

/** Key used to treat "Bench Press" and "bench press " as the same exercise. */
export function exerciseKey(name: string) {
  return name.trim().toLowerCase();
}

export type ExerciseHistoryEntry = ExerciseSessionResult & {
  workoutName: string;
  setsDone: { weight: number; reps: number }[];
  totalReps: number;
  /** Beat the previous heaviest top set (not marked on the first workout). */
  isWeightPr: boolean;
  /** Beat the previous best estimated 1RM (not marked on the first workout). */
  isE1rmPr: boolean;
};

export type ExerciseHistory = {
  key: string;
  name: string;
  /** Newest first. */
  entries: ExerciseHistoryEntry[];
  prWeight: number;
  prReps: number;
  prDate: string;
  bestE1rm: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  firstDate: string;
  lastDate: string;
};

/** Every completed set of one exercise across all workouts, with records marked. */
export function buildExerciseHistory(
  sessions: WorkoutSession[],
  key: string,
): ExerciseHistory | null {
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime(),
  );

  const chronological: ExerciseHistoryEntry[] = [];
  let name = "";
  let bestWeight = -1;
  let bestReps = 0;
  let bestE1rmSoFar = -1;
  let prDate = "";

  for (const session of ordered) {
    // An exercise could appear twice in one workout; merge those sets.
    const done = session.exercises
      .filter((e) => exerciseKey(e.name) === key)
      .flatMap((e) => {
        name ||= e.name.trim();
        return completedSets(e.sets);
      });
    if (done.length === 0) continue;

    const top = done.reduce((best, s) =>
      s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)
        ? s
        : best,
    );
    const e1rm = Math.max(...done.map((s) => estimateOneRepMax(s.weight, s.reps)));
    const isFirst = chronological.length === 0;

    const beatsWeight =
      top.weight > bestWeight || (top.weight === bestWeight && top.reps > bestReps);
    const beatsE1rm = e1rm > bestE1rmSoFar + 1e-9;

    chronological.push({
      sessionId: session.id,
      date: session.finishedAt,
      workoutName: session.name,
      topWeight: top.weight,
      topReps: top.reps,
      bestE1rm: e1rm,
      volume: setVolume(done),
      sets: done.length,
      setsDone: done,
      totalReps: done.reduce((sum, s) => sum + s.reps, 0),
      isWeightPr: !isFirst && beatsWeight,
      isE1rmPr: !isFirst && beatsE1rm,
    });

    if (beatsWeight) {
      bestWeight = top.weight;
      bestReps = top.reps;
      prDate = session.finishedAt;
    }
    if (beatsE1rm) bestE1rmSoFar = e1rm;
  }

  if (chronological.length === 0) return null;

  return {
    key,
    name,
    entries: [...chronological].reverse(),
    prWeight: bestWeight,
    prReps: bestReps,
    prDate,
    bestE1rm: bestE1rmSoFar,
    totalVolume: chronological.reduce((sum, e) => sum + e.volume, 0),
    totalSets: chronological.reduce((sum, e) => sum + e.sets, 0),
    totalReps: chronological.reduce((sum, e) => sum + e.totalReps, 0),
    firstDate: chronological[0].date,
    lastDate: chronological[chronological.length - 1].date,
  };
}
