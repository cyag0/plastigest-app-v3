import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import { notificationPreferencesRoute } from "@/components/Notifications/notificationLinks";
import { useAuth } from "@/contexts/AuthContext";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Appbar } from "react-native-paper";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

/** Engrane de la bandeja: abre las preferencias (como en la campana). */
// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/notifications");

function PreferencesAction() {
  const router = useRouter();
  const { hasPermission, location } = useAuth();
  const allLocations = useAllLocationsAccess();
  if (!hasPermission("notifications_list")) return null;
  return (
    <Appbar.Action
      icon="cog-outline"
      size={20}
      accessibilityLabel="Preferencias de notificaciones"
      onPress={() =>
        router.push(notificationPreferencesRoute(allLocations, !!location) as any)
      }
    />
  );
}

export default function NotificationsLayout() {
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
              rightActions={isIndex ? <PreferencesAction /> : undefined}
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Notificaciones" }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: "Detalle de notificación" }}
      />
    </Stack>
  );
}
