import { Stack } from "expo-router";
import React from "react";

export default function UnidadesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Unidades",
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Nueva Unidad",
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