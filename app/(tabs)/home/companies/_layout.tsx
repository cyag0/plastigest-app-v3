import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/home/companies");

export default function CompaniesLayout() {
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
          title: "Compañías",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Crear Compañía",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Detalle Compañía",
        }}
      />
    </Stack>
  );
}
