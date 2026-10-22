
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
import { WorkoutTemplate } from "@/types/workout";

function openTemplate(id: string) {
  router.push({
    pathname: "/template/[id]",
    params: { id },
  });
}

function TemplateCard({
  template,
}: {
  template: WorkoutTemplate;
}) {
  const count = template.exercises.length;
  const totalSets = template.exercises.reduce(
    (sum, exercise) => sum + exercise.plannedSets,
    0
  );
  const preview = template.exercises
    .map((exercise) => exercise.name)
    .join(", ");

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openTemplate(template.id)}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${template.name} template`}
    >
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{template.name}</Text>
        <Text style={styles.cardInfo}>
          {count} {count === 1 ? "exercise" : "exercises"} •{" "}
          {totalSets} sets
        </Text>

        {preview.length > 0 && (
          <Text style={styles.cardPreview} numberOfLines={1}>
            {preview}
          </Text>
        )}
      </View>

      <Ionicons
        name="create-outline"
        size={22}
        color="#9CA3AF"
      />
    </TouchableOpacity>
  );
}

export default function WorkoutsScreen() {
  const { templates, error, reload } = useTemplates();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Workout Templates</Text>
          <Text style={styles.subtitle}>
            Create and edit your workout plans
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openTemplate("new")}
          accessibilityRole="button"
          accessibilityLabel="Create template"
        >
          <Ionicons name="add" size={26} color="#101416" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={reload} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TemplateCard template={item} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="barbell-outline"
              size={40}
              color="#7D8589"
            />
            <Text style={styles.emptyTitle}>
              No templates yet
            </Text>
            <Text style={styles.emptyText}>
              Tap + to create a template such as Push Day or Leg Day.
            </Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 15,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "#63E6A3",
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
  cardPreview: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 6,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2A1C1E",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: "#F87171",
    fontSize: 14,
  },
  retryText: {
    color: "#63E6A3",
    fontSize: 15,
    fontWeight: "700",
  },
});
