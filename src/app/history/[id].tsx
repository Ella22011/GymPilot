
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getWorkoutSession } from "@/database/workouts";
import type { WorkoutSession } from "@/types/sessions";

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [id]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>

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
  backButton: {
    marginBottom: 24,
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
});
