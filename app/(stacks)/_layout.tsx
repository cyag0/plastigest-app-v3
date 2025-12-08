import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
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
      <Stack.Screen
        name="selectLocation"
        options={{
          title: "Seleccionar Ubicación",
        }}
      />
      <Stack.Screen
        name="notifications/index"
        options={{
          title: "Notificaciones",
        }}
      />
      <Stack.Screen
        name="notifications/[id]"
        options={{
          title: "Detalle de Notificación",
        }}
      />
      <Stack.Screen
        name="tasks/index"
        options={{
          title: "Tareas",
        }}
      />
      <Stack.Screen
        name="tasks/[id]"
        options={{
          title: "Detalle de Tarea",
        }}
      />
    </Stack>
  );
}
