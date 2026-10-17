import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";
import React from "react";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(stacks)");

export default function _layout() {
  return (
    <Stack
      screenLayout={screenLayout}
      screenOptions={{
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            showBackButton={true}
            showSearchButton={false}
            showNotificationButton={false}
            showProfileButton={false}
          />
        ),
      }}
    >
      <Stack.Screen
        name="pos/index"
        options={{
          title: "Punto de venta",
          headerShown: false,
        }}
      />
      {/* Kiosko de autoservicio: pantalla completa, sin gesto de regreso. */}
      <Stack.Screen
        name="kiosk/index"
        options={{
          title: "Kiosko",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="kiosk/setup"
        options={{
          title: "Modo kiosko",
        }}
      />
      <Stack.Screen
        name="selectCompany"
        options={{
          title: "Seleccionar Empresa",
        }}
      />
      <Stack.Screen
        name="selectLocation"
        options={{
          title: "Seleccionar Ubicación",
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{
          title: "Notificaciones",
        }}
      />
      <Stack.Screen
        name="notifications/[id]"
        options={{
          title: "Detalle de Notificación",
        }}
      />
      <Stack.Screen
        name="notification-preferences/index"
        options={{
          title: "Preferencias de Notificaciones",
        }}
      />
      <Stack.Screen
        name="task-notification-guide"
        options={{
          title: "Tareas y Notificaciones",
        }}
      />
      <Stack.Screen
        name="help/index"
        options={{
          title: "Centro de ayuda",
        }}
      />
      <Stack.Screen
        name="help/[topic]"
        options={{
          title: "Ayuda",
        }}
      />
      <Stack.Screen
        name="tasks/index"
        options={{
          title: "Tareas",
        }}
      />
      <Stack.Screen
        name="tasks/[id]"
        options={{
          title: "Detalle de Tarea",
        }}
      />
      <Stack.Screen
        name="activity"
        options={{
          title: "Mi actividad",
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: "Cambiar contraseña",
        }}
      />
    </Stack>
  );
}
