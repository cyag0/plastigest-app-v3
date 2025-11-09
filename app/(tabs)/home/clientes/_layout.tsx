import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";

export default function ClientesLayout() {
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
          title: "Clientes",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Nuevo Cliente",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Ver Detalle de Cliente",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar Cliente",
        }}
      />
    </Stack>
  );
}
