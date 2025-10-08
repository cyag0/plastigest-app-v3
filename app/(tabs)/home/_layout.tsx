import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
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
      />
      <Stack.Screen name="roles" />
      <Stack.Screen name="locations" />
    </Stack>
  );
}
