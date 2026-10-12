
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTemplates } from "@/context/TemplatesContext";

export default function ChooseWorkoutScreen() {
  const { templates } = useTemplates();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
      </TouchableOpacity>

      <Text style={styles.title}>Start Workout</Text>
      <Text style={styles.subtitle}>
        Choose a workout template
      </Text>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/workouts/active",
                params: { templateId: item.id },
              })
            }
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardInfo}>
                {item.exercises.length} exercises
              </Text>
            </View>
            <Ionicons
              name="play-circle"
              size={30}
              color="#63E6A3"
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.subtitle}>
            No templates yet. Create one in Workouts.
          </Text>
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
    marginTop: 24,
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
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  cardInfo: {
    color: "#9CA3AF",
    marginTop: 6,
  },
});
