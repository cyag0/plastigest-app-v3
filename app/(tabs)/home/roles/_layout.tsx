import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";

export default function RolesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            onSearchPress={() => console.log("Search pressed")}
            onNotificationPress={() => console.log("Notifications pressed")}
            onProfilePress={() => console.log("Profile pressed")}
          />
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Roles y Permisos",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "Crear Rol",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Detalle del Rol",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar Rol",
        }}
      />
    </Stack>
  );
}
