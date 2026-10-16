import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";
import React from "react";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/tasks");

export default function TasksLayout() {
  return (
    <Stack
      screenLayout={screenLayout}
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
