import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Alert,
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
  sets: DraftSet[];
};

export default function ActiveWorkoutScreen() {
  const { templateId } = useLocalSearchParams<{
    templateId: string;
  }>();

  const { getTemplate } = useTemplates();
  const template = templateId ? getTemplate(templateId) : undefined;

  const [startedAt] = useState(() => new Date().toISOString());
  const [saving, setSaving] = useState(false);

  const [exercises, setExercises] = useState<DraftExercise[]>(
    () =>
      template?.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        sets: Array.from({ length: exercise.plannedSets }, () => ({
          id: createId(),
          weight: "0",
          reps: String(exercise.plannedReps),
          completed: false,
        })),
      })) ?? [],
  );

  const updateSet = (
    exerciseId: string,
    setId: string,
    changes: Partial<DraftSet>,
  ) => {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...changes } : set,
              ),
            }
          : exercise,
      ),
    );
  };

  const finishWorkout = async () => {
    if (saving || !template) return;

    const completedCount = exercises.reduce(
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

    const invalid = exercises.some((exercise) =>
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

    const completedExercises: SessionExercise[] = exercises
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{template.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Enter your weight and reps, then check off completed sets.
        </Text>

        {exercises.map((exercise) => (
          <View key={exercise.id} style={styles.card}>
            <Text style={styles.exerciseName}>{exercise.name}</Text>

            <View style={styles.row}>
              <Text style={styles.columnLabel}>SET</Text>
              <Text style={styles.columnLabel}>KG</Text>
              <Text style={styles.columnLabel}>REPS</Text>
              <Text style={styles.columnLabel}>DONE</Text>
            </View>

            {exercise.sets.map((set, index) => (
              <View key={set.id} style={styles.row}>
                <Text style={styles.setNumber}>{index + 1}</Text>

                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={set.weight}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, {
                      weight: value.replace(",", "."),
                    })
                  }
                />

                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={set.reps}
                  onChangeText={(value) =>
                    updateSet(exercise.id, set.id, {
                      reps: value.replace(/[^0-9]/g, ""),
                    })
                  }
                />

                <TouchableOpacity
                  style={[styles.checkbox, set.completed && styles.checked]}
                  onPress={() =>
                    updateSet(exercise.id, set.id, {
                      completed: !set.completed,
                    })
                  }
                >
                  {set.completed && (
                    <Ionicons name="checkmark" size={20} color="#101416" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.finishButton, saving && { opacity: 0.5 }]}
          onPress={finishWorkout}
          disabled={saving}
        >
          <Text style={styles.finishText}>
            {saving ? "Saving..." : "Finish Workout"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
    paddingTop: 55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
  },
  back: {
    color: "#63E6A3",
    marginTop: 20,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1B2226",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  columnLabel: {
    color: "#9CA3AF",
    fontSize: 11,
    textAlign: "center",
    flex: 1,
  },
  setNumber: {
    color: "#FFFFFF",
    textAlign: "center",
    flex: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#101416",
    color: "#FFFFFF",
    borderRadius: 8,
    textAlign: "center",
    paddingVertical: 9,
    paddingHorizontal: 3,
  },
  checkbox: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#63E6A3",
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: "#63E6A3",
  },
  finishButton: {
    backgroundColor: "#63E6A3",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  finishText: {
    color: "#101416",
    fontSize: 17,
    fontWeight: "700",
  },
});
