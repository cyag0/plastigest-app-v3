import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

export default function TasksLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, route }) => {
          const isIndex = route.name === "index";
          return (
            <AppBar
              title={options.title || route.name}
              showBackButton={!isIndex}
              showSearchButton={false}
              showNotificationButton={false}
              showProfileButton={false}
            />
          );
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Tareas" }} />
      <Stack.Screen
        name="[id]"
        options={{ title: "Detalle de tarea" }}
      />
    </Stack>
  );
}
