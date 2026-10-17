import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/home/inventory");

export default function InventoryLayout() {
  return (
    <Stack
      screenLayout={screenLayout}
      screenOptions={{
        headerShown: true,
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            showSearchButton={false}
            onNotificationPress={() => console.log("Notifications pressed")}
            onProfilePress={() => console.log("Profile pressed")}
          />
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Inventario semanal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Nuevo inventario",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Inventario",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar inventario",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
