import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function NotificationsLayout() {
  return (
    <Stack
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
        options={{ title: "Detalle de notificacion" }}
      />
    </Stack>
  );
}
