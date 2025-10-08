import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";

export default function CompaniesLayout() {
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
