import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { deleteWorkoutSession, getWorkoutSession } from "@/database/workouts";
import type { WorkoutSession } from "@/types/sessions";

function confirmDelete(name: string, onConfirm: () => void) {
  const message = `Delete "${name}" from your history? This can't be undone.`;
  if (Platform.OS === "web") {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert("Delete workout", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Reload whenever the screen comes into focus, so edits show up right away.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (id) {
        getWorkoutSession(id)
          .then((result) => {
            if (active) setSession(result ?? null);
          })
          .catch((error) => {
            console.error("Failed to load session:", error);
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      } else {
        setLoading(false);
      }

      return () => {
        active = false;
      };
    }, [id]),
  );

  const handleDelete = () => {
    if (!session || deleting) return;

    confirmDelete(session.name, async () => {
      setDeleting(true);
      try {
        await deleteWorkoutSession(session.id);
        router.back();
      } catch (error) {
        console.error("Failed to delete workout:", error);
        Alert.alert("Delete failed", "The workout could not be deleted. Please try again.");
        setDeleting(false);
      }
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {session && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: "/history/edit/[id]",
                params: { id: session.id },
              })
            }
          >
            <Ionicons name="create-outline" size={18} color="#101416" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <Text style={styles.subtitle}>Loading workout...</Text>
      ) : !session ? (
        <Text style={styles.subtitle}>Workout not found.</Text>
      ) : (
        <>
          <Text style={styles.title}>{session.name}</Text>
          <Text style={styles.subtitle}>
            {new Date(session.finishedAt).toLocaleString()}
          </Text>

          {session.exercises.map((exercise, index) => (
            <View key={`${exercise.id}-${index}`} style={styles.card}>
              <Text style={styles.exerciseName}>
                {exercise.name}
              </Text>

              {exercise.sets.map((set, setIndex) => (
                <Text key={set.id} style={styles.setText}>
                  Set {setIndex + 1}: {set.weight} kg × {set.reps} reps
                </Text>
              ))}
            </View>
          ))}

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Ionicons name="trash-outline" size={18} color="#F87171" />
            <Text style={styles.deleteText}>
              {deleting ? "Deleting..." : "Delete workout"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 50,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#63E6A3",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editButtonText: {
    color: "#101416",
    fontSize: 15,
    fontWeight: "700",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  exerciseName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  setText: {
    color: "#9CA3AF",
    fontSize: 15,
    marginTop: 6,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 24,
    padding: 14,
  },
  deleteText: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "600",
  },
});
