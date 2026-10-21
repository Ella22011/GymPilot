import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import * as templateDb from "@/database/templates";
import { WorkoutTemplate } from "@/types/workout";

type TemplatesContextValue = {
  templates: WorkoutTemplate[];
  getTemplate: (id: string) => WorkoutTemplate | undefined;
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
};

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

/**
 * Loads templates from the SQLite database once at startup and keeps them in
 * memory, so screens can read them synchronously. Every change is written to
 * the database and then the list is reloaded from it.
 */
export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    setTemplates(await templateDb.getTemplates());
  };

  useEffect(() => {
    reload()
      .catch((error) => console.error("Failed to load templates", error))
      .finally(() => setLoaded(true));
  }, []);

  const value: TemplatesContextValue = {
    templates,
    getTemplate: (id) => templates.find((t) => t.id === id),
    saveTemplate: async (template) => {
      try {
        await templateDb.saveTemplate(template);
        await reload();
      } catch (error) {
        console.error("Failed to save template", error);
      }
    },
    deleteTemplate: async (id) => {
      try {
        await templateDb.deleteTemplate(id);
        await reload();
      } catch (error) {
        console.error("Failed to delete template", error);
      }
    },
  };

  // Wait for the first load so screens never see an empty list by mistake.
  if (!loaded) return null;

  return (
    <TemplatesContext.Provider value={value}>{children}</TemplatesContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplatesContext);
  if (!context) {
    throw new Error("useTemplates must be used inside a TemplatesProvider");
  }
  return context;
}
