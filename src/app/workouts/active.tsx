import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  AlertButton,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTemplates } from "@/context/TemplatesContext";
import { saveWorkoutSession } from "@/database/workouts";
import type { SessionExercise } from "@/types/sessions";
import { createId } from "@/types/workout";

type DraftSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
};

type DraftExercise = {
  id: string;
  name: string;
  target: string;
  sets: DraftSet[];
};

type UntickedChoice = "markDone" | "skip";

const countUnticked = (list: DraftExercise[]) =>
  list.reduce(
    (total, exercise) =>
      total + exercise.sets.filter((set) => !set.completed).length,
    0,
  );

/** Marks every set as done, in one exercise or (without an id) in all of them. */
const markAllDone = (list: DraftExercise[], exerciseId?: string) =>
  list.map((exercise) =>
    exerciseId && exercise.id !== exerciseId
      ? exercise
      : {
          ...exercise,
          sets: exercise.sets.map((set) => ({ ...set, completed: true })),
        },
  );

/**
 * Warns that some sets aren't ticked, because only ticked sets are saved.
 * The user can go back, mark them as done, or (when allowSkip) continue without them.
 */
function askAboutUntickedSets(
  count: number,
  where: string,
  allowSkip: boolean,
  onChoice: (choice: UntickedChoice) => void,
) {
  const setsText = count === 1 ? "1 set isn't" : `${count} sets aren't`;
  const message = `${setsText} marked as done ${where}. Only ticked sets are saved to your history.`;

  // window.confirm only has OK and Cancel, so the web asks in two steps.
  if (Platform.OS === "web") {
    const cancelText = allowSkip ? "other options" : "go back";
    if (window.confirm(`${message}\n\nOK: mark them as done\nCancel: ${cancelText}`)) {
      onChoice("markDone");
    } else if (
      allowSkip &&
      window.confirm("Continue without the unticked sets?\n\nOK: continue\nCancel: go back")
    ) {
      onChoice("skip");
    }
    return;
  }

  const buttons: AlertButton[] = [
    { text: "Go back", style: "cancel" },
    { text: "Mark as done", onPress: () => onChoice("markDone") },
  ];
  if (allowSkip) {
    buttons.push({
      text: "Continue without them",
      style: "destructive",
      onPress: () => onChoice("skip"),
    });
  }
  Alert.alert("Unticked sets", message, buttons);
}

export default function ActiveWorkoutScreen() {
  const { templateId } = useLocalSearchParams<{
    templateId: string;
  }>();

  const { getTemplate } = useTemplates();
  const template = templateId ? getTemplate(templateId) : undefined;

  const [startedAt] = useState(() => new Date().toISOString());
  const [saving, setSaving] = useState(false);

  // Active workout timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rest timer
  const [restSeconds, setRestSeconds] = useState(90);
  const [isResting, setIsResting] = useState(false);

  // Active exercise view control
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  const [exercises, setExercises] = useState<DraftExercise[]>(
    () =>
      template?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        target: `${exercise.plannedSets} x ${exercise.plannedReps}`,
        sets: Array.from({ length: exercise.plannedSets }, () => ({
          id: createId(),
          weight: "0",
          reps: String(exercise.plannedReps),
          completed: false,
        })),
      })) ?? [],
  );

  // Workout duration timer tick
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Rest countdown timer tick
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isResting && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => prev - 1);
      }, 1000);
    } else if (restSeconds === 0) {
      setIsResting(false);
      setRestSeconds(90);
    }
    return () => clearInterval(interval);
  }, [isResting, restSeconds]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activeExercise = exercises[currentExerciseIndex];

  const updateSet = (
    exerciseId: string,
    setId: string,
    changes: Partial<DraftSet>,
  ) => {
    setExercises((current) =>
      current.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;

        return {
          ...exercise,
          sets: exercise.sets.map((set) => {
            if (set.id !== setId) return set;
            const updatedCompleted =
              changes.completed !== undefined
                ? changes.completed
                : set.completed;

            // Trigger rest timer automatically when marking a set completed
            if (changes.completed === true && !set.completed) {
              setRestSeconds(90);
              setIsResting(true);
            }

            return { ...set, ...changes, completed: updatedCompleted };
          }),
        };
      }),
    );
  };

  const addSet = (exerciseId: string) => {
    setExercises((current) =>
      current.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: createId(),
              weight: lastSet ? lastSet.weight : "0",
              reps: lastSet ? lastSet.reps : "10",
              completed: false,
            },
          ],
        };
      }),
    );
  };

  const goToNextExercise = () => {
    const advance = () => setCurrentExerciseIndex((prev) => prev + 1);
    const unticked = countUnticked([activeExercise]);

    if (unticked === 0) {
      advance();
      return;
    }

    askAboutUntickedSets(unticked, `in ${activeExercise.name}`, true, (choice) => {
      if (choice === "markDone") {
        setExercises((current) => markAllDone(current, activeExercise.id));
      }
      advance();
    });
  };

  const finishWorkout = () => {
    if (saving || !template) return;

    const unticked = countUnticked(exercises);
    if (unticked === 0) {
      void saveWorkout(exercises);
      return;
    }

    // Skipping only makes sense if something is left to save.
    const anyCompleted = exercises.some((exercise) =>
      exercise.sets.some((set) => set.completed),
    );

    askAboutUntickedSets(unticked, "in this workout", anyCompleted, (choice) => {
      if (choice === "markDone") {
        const allDone = markAllDone(exercises);
        setExercises(allDone);
        void saveWorkout(allDone);
      } else {
        void saveWorkout(exercises);
      }
    });
  };

  const saveWorkout = async (list: DraftExercise[]) => {
    if (saving || !template) return;

    const completedCount = list.reduce(
      (total, exercise) =>
        total + exercise.sets.filter((set) => set.completed).length,
      0,
    );

    if (completedCount === 0) {
      Alert.alert(
        "No completed sets",
        "Complete at least one set before finishing.",
      );
      return;
    }

    const invalid = list.some((exercise) =>
      exercise.sets.some(
        (set) =>
          set.completed &&
          (set.weight.trim() === "" ||
            set.reps.trim() === "" ||
            !Number.isFinite(Number(set.weight)) ||
            Number(set.weight) < 0 ||
            !Number.isInteger(Number(set.reps)) ||
            Number(set.reps) < 1),
      ),
    );

    if (invalid) {
      Alert.alert(
        "Invalid values",
        "Check the weight and reps of your completed sets.",
      );
      return;
    }

    const completedExercises: SessionExercise[] = list
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: exercise.sets
          .filter((set) => set.completed)
          .map((set) => ({
            id: set.id,
            weight: Number(set.weight),
            reps: Number(set.reps),
            completed: true,
          })),
      }))
      .filter((exercise) => exercise.sets.length > 0);

    setSaving(true);

    try {
      await saveWorkoutSession({
        id: createId(),
        templateId: template.id,
        name: template.name,
        startedAt,
        finishedAt: new Date().toISOString(),
        exercises: completedExercises,
      });

      router.replace("/history");
    } catch (error) {
      console.error("Failed to save workout:", error);
      Alert.alert(
        "Save failed",
        "Your workout could not be saved. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!template) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Template not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{template.name}</Text>
        <View style={styles.activeTimerBadge}>
          <Text style={styles.activeTimerText}>
            {formatTimer(secondsElapsed)}
          </Text>
          <TouchableOpacity onPress={() => setIsPaused(!isPaused)}>
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={16}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Body */}
      <ScrollView contentContainerStyle={styles.content}>
        {activeExercise && (
          <View key={activeExercise.id}>
            {/* Active Exercise Summary Header */}
            <View style={styles.exerciseHeaderCard}>
              <Text style={styles.exerciseName}>{activeExercise.name}</Text>
              <Text style={styles.exerciseTarget}>
                Target: {activeExercise.target}
              </Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.columnLabel, { flex: 0.8 }]}>Set</Text>
              <Text style={[styles.columnLabel, { flex: 1.5 }]}>
                Weight (kg)
              </Text>
              <Text style={[styles.columnLabel, { flex: 1.5 }]}>Reps</Text>
              <Text
                style={[styles.columnLabel, { flex: 0.8, textAlign: "center" }]}
              >
                ✓
              </Text>
            </View>

            {/* Set Rows */}
            {activeExercise.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setNumber, { flex: 0.8 }]}>
                  {index + 1}
                </Text>

                <TextInput
                  style={[styles.input, { flex: 1.5 }]}
                  keyboardType="decimal-pad"
                  value={set.weight}
                  onChangeText={(value) =>
                    updateSet(activeExercise.id, set.id, {
                      weight: value.replace(",", "."),
                    })
                  }
                />

                <TextInput
                  style={[styles.input, { flex: 1.5 }]}
                  keyboardType="number-pad"
                  value={set.reps}
                  onChangeText={(value) =>
                    updateSet(activeExercise.id, set.id, {
                      reps: value.replace(/[^0-9]/g, ""),
                    })
                  }
                />

                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    { flex: 0.8 },
                    set.completed && styles.checked,
                  ]}
                  onPress={() =>
                    updateSet(activeExercise.id, set.id, {
                      completed: !set.completed,
                    })
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={set.completed ? "#101416" : "#4B5563"}
                  />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Set Button */}
            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => addSet(activeExercise.id)}
            >
              <Text style={styles.addSetText}>+ Add Set</Text>
            </TouchableOpacity>

            {/* Rest Timer Module */}
            <View style={styles.restCard}>
              <View>
                <Text style={styles.restLabel}>Rest Timer</Text>
                <Text style={styles.restTimeText}>
                  {formatTimer(restSeconds)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.restStartButton}
                onPress={() => setIsResting(!isResting)}
              >
                <Text style={styles.restStartText}>
                  {isResting ? "Pause" : "Start"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        {currentExerciseIndex < exercises.length - 1 ? (
          <TouchableOpacity
            style={styles.nextExerciseButton}
            onPress={goToNextExercise}
          >
            <Text style={styles.nextExerciseText}>Next Exercise →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.finishButton, saving && { opacity: 0.5 }]}
            onPress={finishWorkout}
            disabled={saving}
          >
            <Text style={styles.finishText}>
              {saving ? "Saving..." : "Finish Workout"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: "#171D20",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  activeTimerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#242E34",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  activeTimerText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  back: {
    color: "#63E6A3",
    marginTop: 20,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  exerciseHeaderCard: {
    backgroundColor: "#1B2226",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseTarget: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  columnLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B2226",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  setNumber: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#101416",
    color: "#FFFFFF",
    borderRadius: 6,
    textAlign: "center",
    paddingVertical: 8,
    fontSize: 15,
  },
  checkbox: {
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: "#63E6A3",
    borderColor: "#63E6A3",
  },
  addSetButton: {
    backgroundColor: "#1B2226",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 8,
  },
  addSetText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  restCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1B2226",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  restLabel: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  restTimeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  restStartButton: {
    backgroundColor: "#242E34",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  restStartText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    backgroundColor: "#171D20",
    borderTopWidth: 1,
    borderTopColor: "#242E34",
  },
  nextExerciseButton: {
    backgroundColor: "#242E34",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  nextExerciseText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  finishButton: {
    backgroundColor: "#63E6A3",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  finishText: {
    color: "#101416",
    fontSize: 16,
    fontWeight: "700",
  },
});
