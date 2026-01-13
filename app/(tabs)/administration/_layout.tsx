import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: (props) => {
          const { options, route } = props;
          const isIndex = route.name === "index";
          const right = options.headerRight;

          function rightActions() {
            return right ? right() : null;
          }

          return (
            <AppBar
              title={options.title || route.name}
              showSearchButton={false}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
              rightActions={rightActions()}
              showBackButton={!isIndex}
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Administración",
        }}
      />
      <Stack.Screen
        name="companies/index"
        options={{
          title: "Compañías",
        }}
      />
      <Stack.Screen
        name="companies/form"
        options={{
          title: "Nueva Compañía",
        }}
      />
      <Stack.Screen
        name="companies/[id]/index"
        options={{
          title: "Ver Compañía",
        }}
      />
      <Stack.Screen
        name="companies/[id]/edit"
        options={{
          title: "Editar Compañía",
        }}
      />
      <Stack.Screen
        name="company-users/index"
        options={{
          title: "Usuarios de la Compañía",
        }}
      />
      <Stack.Screen
        name="company-users/form"
        options={{
          title: "Nuevo Usuario de la Compañía",
        }}
      />
      <Stack.Screen
        name="company-users/[id]/index"
        options={{
          title: "Ver Usuario de la Compañía",
        }}
      />
      <Stack.Screen
        name="company-users/[id]/edit"
        options={{
          title: "Editar Usuario de la Compañía",
        }}
      />

      <Stack.Screen
        name="locations/index"
        options={{
          title: "Sucursales",
        }}
      />
      <Stack.Screen
        name="locations/form"
        options={{
          title: "Nueva Sucursal",
        }}
      />
      <Stack.Screen
        name="locations/[id]"
        options={{
          title: "Ver Sucursal",
        }}
      />
      <Stack.Screen
        name="locations/[id]/edit"
        options={{
          title: "Editar Sucursal",
        }}
      />
      <Stack.Screen
        name="users/index"
        options={{
          title: "Usuarios",
        }}
      />
      <Stack.Screen
        name="users/form"
        options={{
          title: "Nuevo Usuario",
        }}
      />
      <Stack.Screen
        name="users/[id]/index"
        options={{
          title: "Ver Usuario",
        }}
      />
      <Stack.Screen
        name="users/[id]/edit"
        options={{
          title: "Editar Usuario",
        }}
      />
      <Stack.Screen
        name="workers/index"
        options={{
          title: "Trabajadores",
        }}
      />
      <Stack.Screen
        name="workers/form"
        options={{
          title: "Nuevo Trabajador",
        }}
      />
      <Stack.Screen
        name="workers/[id]/index"
        options={{
          title: "Ver Trabajador",
        }}
      />
      <Stack.Screen
        name="workers/[id]/edit"
        options={{
          title: "Editar Trabajador",
        }}
      />
      <Stack.Screen
        name="current-location/index"
        options={{
          title: "Mi Sucursal",
        }}
      />
      <Stack.Screen
        name="current-workers/index"
        options={{
          title: "Personal de mi Sucursal",
        }}
      />
      <Stack.Screen
        name="current-workers/form"
        options={{
          title: "Nuevo Trabajador",
        }}
      />
      <Stack.Screen
        name="current-workers/[id]/index"
        options={{
          title: "Ver Trabajador",
        }}
      />
      <Stack.Screen
        name="current-workers/[id]/edit"
        options={{
          title: "Editar Trabajador",
        }}
      />
      {/* Categorias */}
      <Stack.Screen
        name="categories/index"
        options={{
          title: "Categorías",
        }}
      />
      <Stack.Screen
        name="categories/form"
        options={{
          title: "Nueva Categoría",
        }}
      />
      <Stack.Screen
        name="categories/[id]/index"
        options={{
          title: "Ver Categoría",
        }}
      />
      <Stack.Screen
        name="categories/[id]/edit"
        options={{
          title: "Editar Categoría",
        }}
      />
      {/* Unidades */}
      <Stack.Screen
        name="unidades/index"
        options={{
          title: "Unidades",
        }}
      />
      <Stack.Screen
        name="unidades/form"
        options={{
          title: "Nueva Unidad",
        }}
      />
      <Stack.Screen
        name="unidades/[id]/index"
        options={{
          title: "Ver Unidad",
        }}
      />
      <Stack.Screen
        name="unidades/[id]/edit"
        options={{
          title: "Editar Unidad",
        }}
      />
      <Stack.Screen
        name="settings/index"
        options={{
          title: "Configuración",
        }}
      />
      <Stack.Screen
        name="settings/notifications"
        options={{
          title: "Notificaciones",
        }}
      />
      <Stack.Screen
        name="settings/working-hours"
        options={{
          title: "Horario de Trabajo",
        }}
      />
      <Stack.Screen
        name="recurring-tasks/index"
        options={{
          title: "Tareas Recurrentes",
        }}
      />
      <Stack.Screen
        name="recurring-tasks/form"
        options={{
          title: "Nueva Tarea Recurrente",
        }}
      />
      <Stack.Screen
        name="recurring-tasks/[id]/index"
        options={{
          title: "Ver Tarea Recurrente",
        }}
      />
      <Stack.Screen
        name="recurring-tasks/[id]/edit"
        options={{
          title: "Editar Tarea Recurrente",
        }}
      />
      <Stack.Screen
        name="packages/index"
        options={{
          title: "Paquetes",
        }}
      />
      <Stack.Screen
        name="packages/form"
        options={{
          title: "Nuevo Paquete",
        }}
      />
      <Stack.Screen
        name="packages/[id]/index"
        options={{
          title: "Ver Paquete",
        }}
      />
      <Stack.Screen
        name="packages/[id]/edit"
        options={{
          title: "Editar Paquete",
        }}
      />
    </Stack>
  );
}
