import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
  console.log("Rendering Select Company Layout");

  return (
    <Stack
      screenOptions={{
        header: ({ options, route }) => (
          <AppBar
            title={options.title || route.name}
            showBackButton={true}
            showSearchButton={false}
            showNotificationButton={false}
            showProfileButton={false}
          />
        ),
      }}
    >
      <Stack.Screen
        name="selectCompany"
        options={{
          title: "Seleccionar Empresa",
        }}
      />
    </Stack>
  );
}
