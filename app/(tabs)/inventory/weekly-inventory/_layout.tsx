import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Stack
      screenOptions={{
        header({ options, route }) {
          return (
            <AppBar
              title={options.title || route.name}
              onSearchPress={() => console.log("Search pressed")}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Inventario", headerShown: false }}
      />
      <Stack.Screen name="form" options={{ title: "Inventario" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Inventario" }} />
      <Stack.Screen name="[id]/edit" options={{ title: "Inventario" }} />
    </Stack>
  );
}
