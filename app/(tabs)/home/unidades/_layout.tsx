import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function UnidadesLayout() {
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
          title: "Unidades",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Nueva Unidad",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Ver Detalle de Unidad",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar Unidad",
        }}
      />
    </Stack>
  );
}
