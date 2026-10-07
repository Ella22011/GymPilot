import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
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

import { useTemplates } from "@/context/TemplatesContext";
import { createId } from "@/types/workout";

// Sets and reps are kept as strings while editing so the fields can be cleared.
type ExerciseDraft = {
  id: string;
  name: string;
  sets: string;
  reps: string;
};

const emptyExercise = (): ExerciseDraft => ({
  id: createId(),
  name: "",
  sets: "3",
  reps: "10",
});

function confirmDelete(name: string, onConfirm: () => void) {
  const message = `Delete "${name}"? This can't be undone.`;
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert("Delete template", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

export default function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTemplate, saveTemplate, deleteTemplate } = useTemplates();

  const existing = id && id !== "new" ? getTemplate(id) : undefined;
  const isNew = !existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [exercises, setExercises] = useState<ExerciseDraft[]>(
    existing
      ? existing.exercises.map((e) => ({
          id: e.id,
          name: e.name,
          sets: String(e.plannedSets),
          reps: String(e.plannedReps),
        }))
      : [emptyExercise()]
  );
  const [error, setError] = useState<string | null>(null);

  const updateExercise = (exerciseId: string, changes: Partial<ExerciseDraft>) => {
    setExercises((current) =>
      current.map((e) => (e.id === exerciseId ? { ...e, ...changes } : e))
    );
    setError(null);
  };

  const removeExercise = (exerciseId: string) =>
    setExercises((current) => current.filter((e) => e.id !== exerciseId));

  const moveExercise = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= exercises.length) return;
    setExercises((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give the template a name.");
      return;
    }

    const filled = exercises.filter((e) => e.name.trim().length > 0);
    if (filled.length === 0) {
      setError("Add at least one exercise.");
      return;
    }

    const invalid = filled.find((e) => {
      const sets = Number(e.sets);
      const reps = Number(e.reps);
      return !Number.isInteger(sets) || sets < 1 || !Number.isInteger(reps) || reps < 1;
    });
    if (invalid) {
      setError(`Check the sets and reps for "${invalid.name.trim()}".`);
      return;
    }

    saveTemplate({
      id: existing?.id ?? createId(),
      name: trimmedName,
      exercises: filled.map((e) => ({
        id: e.id,
        name: e.name.trim(),
        plannedSets: Number(e.sets),
        plannedReps: Number(e.reps),
      })),
    });
    router.back();
  };

  const handleDelete = () => {
    if (!existing) return;
    confirmDelete(existing.name, () => {
      deleteTemplate(existing.id);
      router.back();
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{isNew ? "New Template" : "Edit Template"}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Template name</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          placeholder="e.g. Push Day"
          placeholderTextColor="#5F676B"
        />

        <Text style={[styles.label, styles.sectionLabel]}>Exercises</Text>

        {exercises.map((exercise, index) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseNumber}>{index + 1}</Text>
              <TextInput
                style={styles.exerciseInput}
                value={exercise.name}
                onChangeText={(text) => updateExercise(exercise.id, { name: text })}
                placeholder="Exercise name"
                placeholderTextColor="#5F676B"
              />
              <TouchableOpacity
                onPress={() => moveExercise(index, -1)}
                disabled={index === 0}
                style={styles.smallButton}
              >
                <Ionicons
                  name="arrow-up"
                  size={18}
                  color={index === 0 ? "#3A4246" : "#9CA3AF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveExercise(index, 1)}
                disabled={index === exercises.length - 1}
                style={styles.smallButton}
              >
                <Ionicons
                  name="arrow-down"
                  size={18}
                  color={index === exercises.length - 1 ? "#3A4246" : "#9CA3AF"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeExercise(exercise.id)}
                style={styles.smallButton}
              >
                <Ionicons name="trash-outline" size={18} color="#F87171" />
              </TouchableOpacity>
            </View>

            <View style={styles.planRow}>
              <View style={styles.planField}>
                <Text style={styles.planLabel}>Sets</Text>
                <TextInput
                  style={styles.planInput}
                  value={exercise.sets}
                  onChangeText={(text) =>
                    updateExercise(exercise.id, { sets: text.replace(/[^0-9]/g, "") })
                  }
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <Text style={styles.times}>×</Text>
              <View style={styles.planField}>
                <Text style={styles.planLabel}>Reps</Text>
                <TextInput
                  style={styles.planInput}
                  value={exercise.reps}
                  onChangeText={(text) =>
                    updateExercise(exercise.id, { reps: text.replace(/[^0-9]/g, "") })
                  }
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setExercises((current) => [...current, emptyExercise()])}
        >
          <Ionicons name="add" size={20} color="#63E6A3" />
          <Text style={styles.addExerciseText}>Add exercise</Text>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        {!isNew && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#F87171" />
            <Text style={styles.deleteText}>Delete template</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
    paddingTop: 50,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  iconButton: {
    padding: 6,
  },

  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#63E6A3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },

  saveButtonText: {
    color: "#101416",
    fontSize: 15,
    fontWeight: "700",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  label: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  sectionLabel: {
    marginTop: 24,
  },

  nameInput: {
    backgroundColor: "#1B2226",
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    padding: 16,
    borderRadius: 14,
  },

  exerciseCard: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  exerciseNumber: {
    color: "#63E6A3",
    fontSize: 15,
    fontWeight: "700",
    width: 20,
  },

  exerciseInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#242B2F",
  },

  smallButton: {
    padding: 6,
  },

  planRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 12,
    marginLeft: 26,
  },

  planField: {
    width: 80,
  },

  planLabel: {
    color: "#7D8589",
    fontSize: 12,
    marginBottom: 4,
  },

  planInput: {
    backgroundColor: "#101416",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },

  times: {
    color: "#7D8589",
    fontSize: 18,
    paddingBottom: 10,
  },

  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#63E6A3",
    borderStyle: "dashed",
  },

  addExerciseText: {
    color: "#63E6A3",
    fontSize: 16,
    fontWeight: "600",
  },

  error: {
    color: "#F87171",
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
  },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 32,
    padding: 14,
  },

  deleteText: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "600",
  },
});
