import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { fetchTemplates, putTemplate, removeTemplate } from "@/api/templates";
import { WorkoutTemplate } from "@/types/workout";

type TemplatesContextValue = {
  templates: WorkoutTemplate[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  getTemplate: (id: string) => WorkoutTemplate | undefined;
  saveTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
};

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTemplates()
      .then(setTemplates)
      .catch((e) => setError(`Could not load templates: ${errorMessage(e)}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetchTemplates()
      .then((data) => {
        if (active) setTemplates(data);
      })
      .catch((e) => {
        if (active) setError(`Could not load templates: ${errorMessage(e)}`);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  // Changes are applied locally right away so the UI stays responsive,
  // and rolled back if the API call fails.
  const saveTemplate = (template: WorkoutTemplate) => {
    const previous = templates;
    setError(null);
    setTemplates((current) =>
      current.some((t) => t.id === template.id)
        ? current.map((t) => (t.id === template.id ? template : t))
        : [...current, template]
    );
    putTemplate(template).catch((e) => {
      setTemplates(previous);
      setError(`Could not save "${template.name}": ${errorMessage(e)}`);
    });
  };

  const deleteTemplate = (id: string) => {
    const previous = templates;
    setError(null);
    setTemplates((current) => current.filter((t) => t.id !== id));
    removeTemplate(id).catch((e) => {
      setTemplates(previous);
      setError(`Could not delete template: ${errorMessage(e)}`);
    });
  };

  const value: TemplatesContextValue = {
    templates,
    loading,
    error,
    reload,
    getTemplate: (id) => templates.find((t) => t.id === id),
    saveTemplate,
    deleteTemplate,
  };

  // Wait for the first load so screens opened directly by URL (e.g. /template/<id>) find their template.
  return (
    <TemplatesContext.Provider value={value}>
      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#63E6A3" />
        </View>
      ) : (
        children
      )}
    </TemplatesContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101416",
  },
});

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error("useTemplates must be used inside a TemplatesProvider");
  }
  return context;
}
