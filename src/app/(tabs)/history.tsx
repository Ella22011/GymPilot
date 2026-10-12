import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getWorkoutSessions } from "@/database/workouts";
import type { WorkoutSession } from "@/types/sessions";

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setLoading(true);
      setError(false);

      getWorkoutSessions()
        .then((results) => {
          if (active) setSessions(results);
        })
        .catch((err) => {
          console.error("History loading failed:", err);
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>History</Text>
      <Text style={styles.subtitle}>Your completed workouts</Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#63E6A3"
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <Text style={styles.empty}>
          Couldn't load your workouts. Try reopening History.
        </Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const completedSets = item.exercises.reduce(
              (total: number, exercise: (typeof item.exercises)[number]) =>
                total +
                exercise.sets.filter(
                  (set: (typeof exercise.sets)[number]) => set.completed,
                ).length,
              0,
            );

            const duration = Math.max(
              0,
              Math.round(
                (new Date(item.finishedAt).getTime() -
                  new Date(item.startedAt).getTime()) /
                  60000,
              ),
            );

            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: "/history/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.finishedAt).toLocaleString()}
                  </Text>
                  <Text style={styles.cardInfo}>
                    {item.exercises.length} exercises • {completedSets} sets •{" "}
                    {duration} min
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No completed workouts yet. Start your first workout!
            </Text>
          }
        />
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
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
    marginTop: 8,
  },
  list: {
    paddingTop: 24,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    backgroundColor: "#1B2226",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  cardDate: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 6,
  },
  cardInfo: {
    color: "#63E6A3",
    fontSize: 13,
    marginTop: 8,
  },
  empty: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 48,
    fontSize: 15,
  },
});
