import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good afternoon</Text>
      <Text style={styles.title}>Ready to train?</Text>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>3</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Exercises</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.statLabel}>PRs</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton}>
        <Ionicons name="play" size={20} color="#101416" />
        <Text style={styles.startButtonText}>Start Workout</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Last Workout</Text>

      <View style={styles.workoutCard}>
        <View>
          <Text style={styles.workoutName}>Push Day</Text>
          <Text style={styles.workoutInfo}>
            6 exercises • 1h 12min
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
      </View>
    </View>
  );
}

import Ionicons from "@expo/vector-icons/Ionicons";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101416",
    paddingHorizontal: 20,
    paddingTop: 60,
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
    marginBottom: 28,
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
    marginBottom: 32,
  },

  startButtonText: {
    color: "#101416",
    fontSize: 17,
    fontWeight: "700",
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
  },

  workoutCard: {
    backgroundColor: "#1B2226",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  workoutName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },

  workoutInfo: {
    color: "#9CA3AF",
    marginTop: 6,
  },
});