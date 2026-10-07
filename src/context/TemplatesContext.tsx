import { createContext, ReactNode, useContext, useState } from "react";

import { createId, WorkoutTemplate } from "@/types/workout";

type TemplatesContextValue = {
  templates: WorkoutTemplate[];
  getTemplate: (id: string) => WorkoutTemplate | undefined;
  saveTemplate: (template: WorkoutTemplate) => void;
  deleteTemplate: (id: string) => void;
};

const TemplatesContext = createContext<TemplatesContextValue | null>(null);

const exercise = (name: string, plannedSets: number, plannedReps: number) => ({
  id: createId(),
  name,
  plannedSets,
  plannedReps,
});

// Example templates so the screen isn't empty on first launch.
const initialTemplates: WorkoutTemplate[] = [
  {
    id: createId(),
    name: "Push Day",
    exercises: [
      exercise("Bench Press", 4, 8),
      exercise("Overhead Press", 3, 8),
      exercise("Incline Dumbbell Press", 3, 10),
      exercise("Triceps Pushdown", 3, 12),
    ],
  },
  {
    id: createId(),
    name: "Pull Day",
    exercises: [
      exercise("Deadlift", 3, 5),
      exercise("Pull-Up", 3, 8),
      exercise("Barbell Row", 3, 10),
      exercise("Biceps Curl", 3, 12),
    ],
  },
  {
    id: createId(),
    name: "Leg Day",
    exercises: [
      exercise("Squat", 4, 6),
      exercise("Romanian Deadlift", 3, 10),
      exercise("Leg Press", 3, 12),
      exercise("Calf Raise", 3, 15),
    ],
  },
];

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(initialTemplates);

  const value: TemplatesContextValue = {
    templates,
    getTemplate: (id) => templates.find((t) => t.id === id),
    saveTemplate: (template) =>
      setTemplates((current) =>
        current.some((t) => t.id === template.id)
          ? current.map((t) => (t.id === template.id ? template : t))
          : [...current, template]
      ),
    deleteTemplate: (id) =>
      setTemplates((current) => current.filter((t) => t.id !== id)),
  };

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
