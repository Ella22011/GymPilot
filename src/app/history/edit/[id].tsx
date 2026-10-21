import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getWorkoutSession, updateWorkoutSession } from "@/database/workouts";
import type { SessionExercise, WorkoutSession } from "@/types/sessions";
import { createId } from "@/types/workout";

// Weight and reps are strings while editing so the fields can be cleared.
type DraftSet = {
  id: string;
  weight: string;
  reps: string;
};

type DraftExercise = {
  id: string;
  name: string;
  sets: DraftSet[];
};

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<DraftExercise[]>([]);

  useEffect(() => {
    let active = true;

    if (!id) {
      setLoading(false);
      return;
    }

    getWorkoutSession(id)
      .then((result) => {
        if (!active || !result) return;
        setSession(result);
        setName(result.name);
        setExercises(
          result.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.name,
            sets: exercise.sets.map((set) => ({
              id: set.id,
              weight: String(set.weight),
              reps: String(set.reps),
            })),
          })),
        );
      })
      .catch((error) => console.error("Failed to load workout:", error))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const updateSet = (exerciseIndex: number, setId: string, changes: Partial<DraftSet>) =>
    setExercises((current) =>
      current.map((exercise, index) =>
        index !== exerciseIndex
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...changes } : set,
              ),
            },
      ),
    );

  const addSet = (exerciseIndex: number) =>
    setExercises((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise;
        const last = exercise.sets[exercise.sets.length - 1];
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            { id: createId(), weight: last?.weight ?? "0", reps: last?.reps ?? "10" },
          ],
        };
      }),
    );

  const removeSet = (exerciseIndex: number, setId: string) =>
    setExercises((current) =>
      current.map((exercise, index) =>
        index !== exerciseIndex
          ? exercise
          : { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) },
      ),
    );

  const removeExercise = (exerciseIndex: number) =>
    setExercises((current) => current.filter((_, index) => index !== exerciseIndex));

  const handleSave = async () => {
    if (!session || saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      showMessage("Missing name", "Give the workout a name.");
      return;
    }

    const remaining = exercises.filter((exercise) => exercise.sets.length > 0);
    if (remaining.length === 0) {
      showMessage(
        "No sets left",
        "A workout needs at least one set. To remove it completely, use Delete workout instead.",
      );
      return;
    }

    const invalid = remaining.find((exercise) =>
      exercise.sets.some(
        (set) =>
          set.weight.trim() === "" ||
          set.reps.trim() === "" ||
          !Number.isFinite(Number(set.weight)) ||
          Number(set.weight) < 0 ||
          !Number.isInteger(Number(set.reps)) ||
          Number(set.reps) < 1,
      ),
    );
    if (invalid) {
      showMessage("Invalid values", `Check the weight and reps for ${invalid.name}.`);
      return;
    }

    const updatedExercises: SessionExercise[] = remaining.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        id: set.id,
        weight: Number(set.weight),
        reps: Number(set.reps),
        completed: true,
      })),
    }));

    setSaving(true);
    try {
      await updateWorkoutSession({
        ...session,
        name: trimmedName,
        exercises: updatedExercises,
      });
      router.back();
    } catch (error) {
      console.error("Failed to update workout:", error);
      showMessage("Save failed", "Your changes could not be saved. Please try again.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#63E6A3" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.subtitle}>Workout not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Workout</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Workout name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Push Day"
          placeholderTextColor="#5F676B"
        />
        <Text style={styles.dateText}>
          {new Date(session.finishedAt).toLocaleString()}
        </Text>

        {exercises.map((exercise, exerciseIndex) => (
          <View key={`${exercise.id}-${exerciseIndex}`} style={styles.card}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <TouchableOpacity
                onPress={() => removeExercise(exerciseIndex)}
                style={styles.iconButton}
                accessibilityLabel={`Remove ${exercise.name}`}
              >
                <Ionicons name="trash-outline" size={20} color="#F87171" />
              </TouchableOpacity>
            </View>

            {exercise.sets.length > 0 && (
              <View style={styles.tableHeader}>
                <Text style={[styles.columnLabel, styles.setColumn]}>Set</Text>
                <Text style={[styles.columnLabel, styles.inputColumn]}>Weight (kg)</Text>
                <Text style={[styles.columnLabel, styles.inputColumn]}>Reps</Text>
                <View style={styles.removeColumn} />
              </View>
            )}

            {exercise.sets.map((set, setIndex) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={[styles.setNumber, styles.setColumn]}>{setIndex + 1}</Text>
                <TextInput
                  style={[styles.input, styles.inputColumn]}
                  keyboardType="decimal-pad"
                  value={set.weight}
                  onChangeText={(value) =>
                    updateSet(exerciseIndex, set.id, { weight: value.replace(",", ".") })
                  }
                />
                <TextInput
                  style={[styles.input, styles.inputColumn]}
                  keyboardType="number-pad"
                  value={set.reps}
                  onChangeText={(value) =>
                    updateSet(exerciseIndex, set.id, { reps: value.replace(/[^0-9]/g, "") })
                  }
                />
                <TouchableOpacity
                  style={[styles.removeColumn, styles.removeSetButton]}
                  onPress={() => removeSet(exerciseIndex, set.id)}
                  accessibilityLabel={`Remove set ${setIndex + 1}`}
                >
                  <Ionicons name="remove-circle-outline" size={22} color="#7D8589" />
                </TouchableOpacity>
              </View>
            ))}

            {exercise.sets.length === 0 && (
              <Text style={styles.noSetsText}>
                No sets — this exercise will be removed when you save.
              </Text>
            )}

            <TouchableOpacity style={styles.addSetButton} onPress={() => addSet(exerciseIndex)}>
              <Ionicons name="add" size={18} color="#63E6A3" />
              <Text style={styles.addSetText}>Add set</Text>
            </TouchableOpacity>
          </View>
        ))}

        {exercises.length === 0 && (
          <Text style={styles.noSetsText}>
            All exercises removed. Close without saving, or go back and use Delete
            workout to remove it from your history.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 55,
    paddingBottom: 14,
    backgroundColor: "#171D20",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  iconButton: {
    padding: 6,
  },
  saveButton: {
    backgroundColor: "#63E6A3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#101416",
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  label: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: "#1B2226",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    padding: 14,
    borderRadius: 12,
  },
  dateText: {
    color: "#7D8589",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
  },
  backLink: {
    color: "#63E6A3",
    marginTop: 16,
    fontSize: 15,
  },
  card: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    flexShrink: 1,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  columnLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  setColumn: {
    width: 32,
  },
  inputColumn: {
    flex: 1,
  },
  removeColumn: {
    width: 36,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  setNumber: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#101416",
    color: "#FFFFFF",
    borderRadius: 8,
    textAlign: "center",
    paddingVertical: 9,
    fontSize: 15,
  },
  removeSetButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 38,
  },
  noSetsText: {
    color: "#7D8589",
    fontSize: 13,
    marginBottom: 8,
  },
  addSetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2E5D47",
    borderStyle: "dashed",
  },
  addSetText: {
    color: "#63E6A3",
    fontWeight: "600",
  },
});
