import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { BarChart } from "@/components/BarChart";
import { getWorkoutSessions } from "@/database/workouts";
import {
  buildProgressSummary,
  ExerciseProgress,
  formatShortDate,
  formatVolume,
  formatWeight,
  ProgressSummary,
} from "@/utils/progress";

const CHART_SESSIONS = 8;

function compactVolume(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : String(Math.round(kg));
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ExerciseDetail({ exercise }: { exercise: ExerciseProgress }) {
  const recent = exercise.sessions.slice(-CHART_SESSIONS);
  const last = exercise.sessions[exercise.sessions.length - 1];
  const first = exercise.sessions[0];
  const change = last.topWeight - first.topWeight;

  return (
    <View style={styles.card}>
      <View style={styles.miniStats}>
        <View style={styles.miniStat}>
          <Text style={styles.miniLabel}>Best set</Text>
          <Text style={styles.miniValue}>
            {formatWeight(exercise.prWeight)} kg × {exercise.prReps}
          </Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={styles.miniLabel}>Est. 1RM</Text>
          <Text style={styles.miniValue}>{formatWeight(Math.round(exercise.bestE1rm))} kg</Text>
        </View>
        <View style={styles.miniStat}>
          <Text style={styles.miniLabel}>Last time</Text>
          <Text style={styles.miniValue}>
            {formatWeight(last.topWeight)} kg × {last.topReps}
          </Text>
        </View>
      </View>

      <Text style={styles.chartTitle}>Heaviest set per workout (kg)</Text>
      <BarChart
        height={120}
        data={recent.map((s) => ({
          label: formatShortDate(s.date),
          value: s.topWeight,
          valueLabel: formatWeight(s.topWeight),
          highlight: s.topWeight === exercise.prWeight,
        }))}
      />

      <View style={styles.changeRow}>
        {exercise.sessions.length < 2 ? (
          <Text style={styles.changeText}>
            Log this exercise again to see your trend.
          </Text>
        ) : (
          <>
            <Ionicons
              name={change > 0 ? "trending-up" : change < 0 ? "trending-down" : "remove"}
              size={18}
              color={change > 0 ? "#63E6A3" : change < 0 ? "#F87171" : "#9CA3AF"}
            />
            <Text style={styles.changeText}>
              {change === 0
                ? "Same top weight"
                : `${change > 0 ? "+" : ""}${formatWeight(change)} kg`}{" "}
              since {formatShortDate(first.date)} • {exercise.sessions.length} workouts
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const exerciseSectionY = useRef(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(false);

      getWorkoutSessions()
        .then((sessions) => {
          if (active) setSummary(buildProgressSummary(sessions));
        })
        .catch((err) => {
          console.error("Progress loading failed:", err);
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

  const header = (
    <>
      <Text style={styles.title}>Progress</Text>
      <Text style={styles.subtitle}>Your training at a glance</Text>
    </>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator size="large" color="#63E6A3" style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (error || !summary) {
    return (
      <View style={styles.container}>
        {header}
        <Text style={styles.emptyText}>
          Couldn't load your progress. Try reopening this tab.
        </Text>
      </View>
    );
  }

  if (summary.exercises.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <View style={styles.empty}>
          <Ionicons name="stats-chart" size={40} color="#7D8589" />
          <Text style={styles.emptyTitle}>No progress yet</Text>
          <Text style={styles.emptyText}>
            Finish a workout with completed sets and your records and charts will
            show up here.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push("/(tabs)/workouts")}
          >
            <Ionicons name="play" size={18} color="#101416" />
            <Text style={styles.startButtonText}>Start a workout</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const selected =
    summary.exercises.find((e) => e.key === selectedKey) ?? summary.exercises[0];
  const currentWeek = summary.weeklyVolume[summary.weeklyVolume.length - 1];
  const weeksWithTraining = summary.weeklyVolume.filter((w) => w.workouts > 0).length;

  const selectExercise = (key: string, scroll: boolean) => {
    setSelectedKey(key);
    if (scroll) {
      scrollRef.current?.scrollTo({ y: exerciseSectionY.current - 12, animated: true });
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      {header}

      <View style={styles.stats}>
        <StatCard value={String(summary.totalWorkouts)} label="Workouts" />
        <StatCard value={String(currentWeek.workouts)} label="This week" />
        <StatCard value={formatVolume(summary.totalVolume)} label="Total volume" />
      </View>

      <Text style={styles.sectionTitle}>Weekly volume</Text>
      <View style={styles.card}>
        <Text style={styles.cardCaption}>
          This week {formatVolume(currentWeek.volume)} • trained {weeksWithTraining} of
          the last {summary.weeklyVolume.length} weeks
        </Text>
        <BarChart
          data={summary.weeklyVolume.map((w, index) => ({
            label: formatShortDate(w.weekStart),
            value: w.volume,
            valueLabel: compactVolume(w.volume),
            highlight: index === summary.weeklyVolume.length - 1,
          }))}
        />
        <Text style={styles.chartFootnote}>Weight × reps of completed sets, per week</Text>
      </View>

      <View onLayout={(e) => (exerciseSectionY.current = e.nativeEvent.layout.y)}>
        <Text style={styles.sectionTitle}>Exercise progress</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {summary.exercises.map((exercise) => {
          const isSelected = exercise.key === selected.key;
          return (
            <TouchableOpacity
              key={exercise.key}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => selectExercise(exercise.key, false)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {exercise.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ExerciseDetail exercise={selected} />

      <Text style={styles.sectionTitle}>Personal records</Text>
      <View style={styles.prList}>
        {summary.exercises.map((exercise, index) => (
          <TouchableOpacity
            key={exercise.key}
            style={[styles.prRow, index > 0 && styles.prRowBorder]}
            onPress={() => selectExercise(exercise.key, true)}
          >
            <View style={styles.prIcon}>
              <Ionicons name="trophy" size={16} color="#F5C451" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prName}>{exercise.name}</Text>
              <Text style={styles.prDate}>
                {formatShortDate(exercise.prDate)} • {exercise.sessions.length}{" "}
                {exercise.sessions.length === 1 ? "workout" : "workouts"}
              </Text>
            </View>
            <Text style={styles.prValue}>
              {formatWeight(exercise.prWeight)} kg × {exercise.prReps}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#101416",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#101416",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },

  subtitle: {
    color: "#9CA3AF",
    fontSize: 16,
    marginTop: 4,
    marginBottom: 24,
  },

  stats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#1B2226",
    paddingVertical: 18,
    paddingHorizontal: 8,
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

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
  },

  cardCaption: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 16,
  },

  chartTitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 12,
  },

  chartFootnote: {
    color: "#5F676B",
    fontSize: 11,
    marginTop: 12,
  },

  chipsScroll: {
    marginHorizontal: -20,
    marginBottom: 12,
    flexGrow: 0,
  },

  chips: {
    paddingHorizontal: 20,
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1B2226",
  },

  chipSelected: {
    backgroundColor: "#63E6A3",
  },

  chipText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },

  chipTextSelected: {
    color: "#101416",
  },

  miniStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },

  miniStat: {
    flex: 1,
    backgroundColor: "#101416",
    borderRadius: 12,
    padding: 10,
  },

  miniLabel: {
    color: "#7D8589",
    fontSize: 11,
  },

  miniValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },

  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },

  changeText: {
    color: "#9CA3AF",
    fontSize: 13,
    flexShrink: 1,
  },

  prList: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    paddingHorizontal: 16,
  },

  prRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },

  prRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#242B2F",
  },

  prIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#2A2617",
    alignItems: "center",
    justifyContent: "center",
  },

  prName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  prDate: {
    color: "#7D8589",
    fontSize: 12,
    marginTop: 3,
  },

  prValue: {
    color: "#63E6A3",
    fontSize: 15,
    fontWeight: "700",
  },

  empty: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 12,
  },

  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },

  startButton: {
    backgroundColor: "#63E6A3",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },

  startButtonText: {
    color: "#101416",
    fontSize: 16,
    fontWeight: "700",
  },
});
