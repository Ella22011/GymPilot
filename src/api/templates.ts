import { WorkoutTemplate } from "@/types/workout";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not set");
  }

  const response = await fetch(`${API_URL}/api/templates${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export function fetchTemplates() {
  return request<WorkoutTemplate[]>("");
}

/** Creates the template if the id is new, otherwise replaces it. */
export function putTemplate(template: WorkoutTemplate) {
  return request<WorkoutTemplate>(`/${encodeURIComponent(template.id)}`, {
    method: "PUT",
    body: JSON.stringify(template),
  });
}

export function removeTemplate(id: string) {
  return request<void>(`/${encodeURIComponent(id)}`, { method: "DELETE" });
}
