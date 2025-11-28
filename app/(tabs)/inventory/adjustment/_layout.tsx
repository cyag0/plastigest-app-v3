import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";

export default function InventoryAdjustmentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            //onSearchPress={() => console.log("Search pressed")}
            onNotificationPress={() => console.log("Notifications pressed")}
            onProfilePress={() => console.log("Profile pressed")}
          />
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Ajustes",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Nuevo Ajuste",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Ver Detalle del Ajuste",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar Ajuste",
        }}
      />
    </Stack>
  );
}
