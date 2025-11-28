import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function LocationsLayout() {
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
          title: "Trabajadores",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Crear Trabajador",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Detalles de Trabajador",
        }}
      />
    </Stack>
  );
}
