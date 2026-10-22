import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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
  buildExerciseHistory,
  ExerciseHistory,
  ExerciseHistoryEntry,
  exerciseKey,
  formatShortDate,
  formatVolume,
  formatWeight,
} from "@/utils/progress";

const CHART_SESSIONS = 10;

type Metric = "weight" | "e1rm" | "volume";

const METRICS: { id: Metric; label: string; caption: string }[] = [
  { id: "weight", label: "Top set", caption: "Heaviest set per workout (kg)" },
  { id: "e1rm", label: "Est. 1RM", caption: "Estimated one-rep max per workout (kg)" },
  { id: "volume", label: "Volume", caption: "Weight × reps per workout" },
];

function metricValue(entry: ExerciseHistoryEntry, metric: Metric) {
  if (metric === "weight") return entry.topWeight;
  if (metric === "e1rm") return Math.round(entry.bestE1rm * 10) / 10;
  return entry.volume;
}

function metricLabel(value: number, metric: Metric) {
  if (metric === "volume") {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}t` : String(Math.round(value));
  }
  return formatWeight(Math.round(value));
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {detail ? <Text style={styles.statDetail}>{detail}</Text> : null}
    </View>
  );
}

function TrendLine({ history, metric }: { history: ExerciseHistory; metric: Metric }) {
  if (history.entries.length < 2) {
    return (
      <Text style={[styles.trendText, styles.trendAlone]}>
        Log this exercise again to see your trend.
      </Text>
    );
  }

  const latest = history.entries[0];
  const previous = history.entries[1];
  const first = history.entries[history.entries.length - 1];

  const sinceFirst = metricValue(latest, metric) - metricValue(first, metric);
  const sinceLast = metricValue(latest, metric) - metricValue(previous, metric);
  const unit = metric === "volume" ? "" : " kg";

  const format = (diff: number) => {
    if (diff === 0) return "no change";
    const amount =
      metric === "volume" ? formatVolume(Math.abs(diff)) : `${formatWeight(Math.abs(Math.round(diff * 10) / 10))}${unit}`;
    return `${diff > 0 ? "+" : "−"}${amount}`;
  };

  return (
    <View style={styles.trendRow}>
      <Ionicons
        name={sinceFirst > 0 ? "trending-up" : sinceFirst < 0 ? "trending-down" : "remove"}
        size={18}
        color={sinceFirst > 0 ? "#63E6A3" : sinceFirst < 0 ? "#F87171" : "#9CA3AF"}
      />
      <Text style={styles.trendText}>
        {format(sinceFirst)} since {formatShortDate(first.date)} • {format(sinceLast)} vs.
        last time
      </Text>
    </View>
  );
}

function HistoryEntryCard({ entry }: { entry: ExerciseHistoryEntry }) {
  return (
    <TouchableOpacity
      style={styles.entryCard}
      activeOpacity={0.8}
      onPress={() =>
        router.push({ pathname: "/history/[id]", params: { id: entry.sessionId } })
      }
    >
      <View style={styles.entryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
          <Text style={styles.entryWorkout}>{entry.workoutName}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#7D8589" />
      </View>

      {(entry.isWeightPr || entry.isE1rmPr) && (
        <View style={styles.badges}>
          {entry.isWeightPr && (
            <View style={styles.badge}>
              <Ionicons name="trophy" size={12} color="#F5C451" />
              <Text style={styles.badgeText}>Weight PR</Text>
            </View>
          )}
          {entry.isE1rmPr && (
            <View style={styles.badge}>
              <Ionicons name="flash" size={12} color="#F5C451" />
              <Text style={styles.badgeText}>1RM PR</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.setChips}>
        {entry.setsDone.map((set, index) => {
          const isTop = set.weight === entry.topWeight && set.reps === entry.topReps;
          return (
            <View key={index} style={[styles.setChip, isTop && styles.setChipTop]}>
              <Text style={[styles.setChipText, isTop && styles.setChipTextTop]}>
                {formatWeight(set.weight)} × {set.reps}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.entryFooter}>
        {entry.sets} {entry.sets === 1 ? "set" : "sets"} • {entry.totalReps} reps •{" "}
        {formatVolume(entry.volume)} • est. 1RM {formatWeight(Math.round(entry.bestE1rm))} kg
      </Text>
    </TouchableOpacity>
  );
}

export default function ExerciseHistoryScreen() {
  const { key: rawKey } = useLocalSearchParams<{ key: string }>();
  const key = exerciseKey(rawKey ?? "");

  const [history, setHistory] = useState<ExerciseHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [metric, setMetric] = useState<Metric>("weight");

  // Reload on focus so edited or deleted workouts are reflected.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(false);

      getWorkoutSessions()
        .then((sessions) => {
          if (active) setHistory(buildExerciseHistory(sessions, key));
        })
        .catch((err) => {
          console.error("Exercise history loading failed:", err);
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [key]),
  );

  const backButton = (
    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
      <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          {backButton}
          <ActivityIndicator size="large" color="#63E6A3" style={{ marginTop: 40 }} />
        </View>
      </View>
    );
  }

  if (error || !history) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          {backButton}
          <Text style={styles.title}>{error ? "Something went wrong" : "No history"}</Text>
          <Text style={styles.subtitle}>
            {error
              ? "Couldn't load this exercise. Try opening it again."
              : "There are no completed sets for this exercise yet."}
          </Text>
        </View>
      </View>
    );
  }

  const chartEntries = history.entries.slice(0, CHART_SESSIONS).reverse();
  const bestOfMetric = Math.max(...chartEntries.map((e) => metricValue(e, metric)));
  const activeMetric = METRICS.find((m) => m.id === metric)!;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {backButton}

      <Text style={styles.title}>{history.name}</Text>
      <Text style={styles.subtitle}>
        {history.entries.length} {history.entries.length === 1 ? "workout" : "workouts"} •
        since {formatShortDate(history.firstDate)}
        {new Date(history.firstDate).getFullYear()}
      </Text>

      <View style={styles.statGrid}>
        <StatTile
          label="Best set"
          value={`${formatWeight(history.prWeight)} kg × ${history.prReps}`}
          detail={formatShortDate(history.prDate)}
        />
        <StatTile
          label="Est. 1RM"
          value={`${formatWeight(Math.round(history.bestE1rm))} kg`}
        />
        <StatTile label="Total volume" value={formatVolume(history.totalVolume)} />
        <StatTile
          label="Sets / reps"
          value={`${history.totalSets} / ${history.totalReps}`}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.segmented}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.segment, metric === m.id && styles.segmentActive]}
              onPress={() => setMetric(m.id)}
            >
              <Text style={[styles.segmentText, metric === m.id && styles.segmentTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.chartCaption}>
          {activeMetric.caption}
          {history.entries.length > CHART_SESSIONS ? ` • last ${CHART_SESSIONS}` : ""}
        </Text>

        <BarChart
          height={130}
          data={chartEntries.map((entry) => {
            const value = metricValue(entry, metric);
            return {
              label: formatShortDate(entry.date),
              value,
              valueLabel: metricLabel(value, metric),
              highlight: value === bestOfMetric,
            };
          })}
        />

        <TrendLine history={history} metric={metric} />
      </View>

      <Text style={styles.sectionTitle}>History</Text>
      {history.entries.map((entry) => (
        <HistoryEntryCard key={entry.sessionId} entry={entry} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#101416",
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 50,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
    marginTop: 6,
    marginBottom: 20,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 14,
  },
  statLabel: {
    color: "#7D8589",
    fontSize: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  statDetail: {
    color: "#63E6A3",
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#101416",
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#63E6A3",
  },
  segmentText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#101416",
  },
  chartCaption: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  trendText: {
    color: "#9CA3AF",
    fontSize: 13,
    flexShrink: 1,
  },
  trendAlone: {
    marginTop: 14,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: "#1B2226",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  entryDate: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  entryWorkout: {
    color: "#7D8589",
    fontSize: 13,
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2A2617",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: "#F5C451",
    fontSize: 12,
    fontWeight: "700",
  },
  setChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  setChip: {
    backgroundColor: "#101416",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setChipTop: {
    backgroundColor: "#1F3A2E",
  },
  setChipText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontWeight: "600",
  },
  setChipTextTop: {
    color: "#63E6A3",
  },
  entryFooter: {
    color: "#7D8589",
    fontSize: 12,
    marginTop: 12,
  },
});
