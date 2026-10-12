
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useTemplates } from "@/context/TemplatesContext";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChooseWorkoutScreen() {
  const { templates } = useTemplates();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Start Workout</Text>
      <Text style={styles.subtitle}>
        Choose a workout template to begin
      </Text>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/workouts/active",
                params: { templateId: item.id },
              })
            }
          >
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardInfo}>
                {item.exercises.length}{" "}
                {item.exercises.length === 1
                  ? "exercise"
                  : "exercises"}
              </Text>
            </View>

            <Ionicons
              name="play-circle-outline"
              size={26}
              color="#63E6A3"
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="barbell-outline"
              size={40}
              color="#7D8589"
            />
            <Text style={styles.emptyTitle}>No templates yet</Text>
            <Text style={styles.emptyText}>
              Create a template before starting a workout.
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push("/(tabs)/workouts")}
            >
              <Text style={styles.createButtonText}>
                Manage Templates
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    fontSize: 15,
    marginTop: 6,
    marginBottom: 20,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#1B2226",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  cardInfo: {
    color: "#63E6A3",
    fontSize: 13,
    marginTop: 6,
  },
  empty: {
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },
  createButton: {
    backgroundColor: "#63E6A3",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  createButtonText: {
    color: "#101416",
    fontWeight: "700",
  },
});
