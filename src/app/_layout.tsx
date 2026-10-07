import { Stack } from "expo-router";

import { TemplatesProvider } from "@/context/TemplatesContext";

export default function RootLayout() {
  return (
    <TemplatesProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="template/[id]" />
      </Stack>
    </TemplatesProvider>
  );
}
