import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTemplates } from "@/context/TemplatesContext";
import { getWorkoutSessions } from "@/database/workouts";
import type { WorkoutSession } from "@/types/sessions";

export default function HomeScreen() {
  const { templates } = useTemplates();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh the workout history whenever Home becomes active.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      getWorkoutSessions()
        .then((results) => {
          if (active) {
            setSessions(results);
          }
        })
        .catch((error) => {
          console.error("Failed to load workout history:", error);
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const lastWorkout = sessions[0];

  const exerciseCount = new Set(
    templates.flatMap((template) =>
      template.exercises.map((exercise) => exercise.name.toLowerCase()),
    ),
  ).size;

  // Count exercises that have a new heaviest completed set.
  const personalRecords = new Map<string, number>();

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exercise.sets.forEach((set) => {
        if (set.completed) {
          const key = exercise.name.toLowerCase();
          const previous = personalRecords.get(key) ?? 0;

          if (set.weight > previous) {
            personalRecords.set(key, set.weight);
          }
        }
      });
    });
  });

  const startWorkout = () => {
    router.push("/workouts/active");
  };

  const openHistory = () => {
    router.push("/history");
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>Ready to train?</Text>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => {
            // Settings screen will be implemented later.
          }}
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary statistics */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{sessions.length}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{exerciseCount}</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{personalRecords.size}</Text>
          <Text style={styles.statLabel}>PRs</Text>
        </View>
      </View>

      {/* Start a workout */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={startWorkout}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={20} color="#101416" />
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>

      {/* Manage workout templates */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("/workouts")}
        activeOpacity={0.8}
      >
        <Ionicons name="barbell-outline" size={20} color="#63E6A3" />
        <Text style={styles.secondaryButtonText}>Manage Workout Templates</Text>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Most recent completed workout */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Last Workout</Text>

        <TouchableOpacity onPress={openHistory}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#63E6A3" size="small" style={styles.loader} />
      ) : lastWorkout ? (
        <TouchableOpacity
          style={styles.workoutCard}
          onPress={() =>
            router.push({
              pathname: "/history/[id]",
              params: { id: lastWorkout.id },
            })
          }
          activeOpacity={0.8}
        >
          <View style={styles.workoutIcon}>
            <Ionicons name="checkmark-circle" size={26} color="#63E6A3" />
          </View>

          <View style={styles.workoutText}>
            <Text style={styles.workoutName}>{lastWorkout.name}</Text>

            <Text style={styles.workoutInfo}>
              {lastWorkout.exercises.length} exercises ·{" "}
              {new Date(lastWorkout.finishedAt).toLocaleDateString()}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="barbell-outline" size={28} color="#7D8589" />
          <Text style={styles.emptyTitle}>No workouts yet</Text>
          <Text style={styles.emptyText}>
            Complete your first workout and it will appear here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },

  greeting: {
    color: "#9CA3AF",
    fontSize: 16,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 4,
  },

  settingsButton: {
    backgroundColor: "#242B2F",
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#1B2226",
    paddingVertical: 18,
    alignItems: "center",
    borderRadius: 16,
  },

  statNumber: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  statLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 5,
  },

  startButton: {
    backgroundColor: "#63E6A3",
    padding: 17,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  startButtonText: {
    color: "#101416",
    fontSize: 17,
    fontWeight: "700",
  },

  secondaryButton: {
    backgroundColor: "#1B2226",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 30,
  },

  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },

  seeAll: {
    color: "#63E6A3",
    fontSize: 14,
  },

  loader: {
    marginTop: 24,
  },

  workoutCard: {
    backgroundColor: "#1B2226",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  workoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#26372F",
    alignItems: "center",
    justifyContent: "center",
  },

  workoutText: {
    flex: 1,
  },

  workoutName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },

  workoutInfo: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 6,
  },

  emptyCard: {
    backgroundColor: "#1B2226",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    marginTop: 12,
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
