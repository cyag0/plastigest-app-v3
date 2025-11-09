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
          title: "Ventas",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Crear Venta",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Detalle de la Compra",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar Compra",
        }}
      />
    </Stack>
  );
}
