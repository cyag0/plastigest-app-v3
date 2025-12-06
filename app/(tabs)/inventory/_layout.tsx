import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Inventario",
          header: ({ options, route }) => {
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
      />
      <Stack.Screen
        name="weekly-inventory"
        options={{ title: "Inventario", headerShown: false }}
      />
      <Stack.Screen
        name="products"
        options={{ title: "Productos", headerShown: false }}
      />
      <Stack.Screen
        name="adjustment"
        options={{ title: "Ajustes", headerShown: false }}
      />
    </Stack>
  );
}
