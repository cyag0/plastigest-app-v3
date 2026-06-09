import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function TasksLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            showBackButton
            showSearchButton={false}
            showNotificationButton={false}
            showProfileButton={false}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Tareas" }} />
      <Stack.Screen
        name="[id]"
        options={{ title: "Detalle de tarea" }}
      />
    </Stack>
  );
}
