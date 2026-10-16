import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";
import React from "react";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/administration");

export default function _layout() {
  return (
    <Stack
      screenLayout={screenLayout}
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
      <Stack.Screen name="company-users/index" options={{ title: "Usuarios" }} />
      <Stack.Screen name="company-users/form" options={{ title: "Nuevo usuario" }} />
      <Stack.Screen name="company-users/[id]/index" options={{ title: "Usuario" }} />
      <Stack.Screen name="company-users/[id]/edit" options={{ title: "Editar usuario" }} />

      {/* Administración › Esta sucursal */}
      <Stack.Screen name="current-location/users/index" options={{ title: "Usuarios de la sucursal" }} />
      <Stack.Screen name="current-location/users/form" options={{ title: "Nuevo usuario" }} />
      <Stack.Screen name="current-location/users/[id]/index" options={{ title: "Usuario" }} />
      <Stack.Screen name="current-location/users/[id]/edit" options={{ title: "Editar usuario" }} />

      <Stack.Screen name="cash-registers/index" options={{ title: "Cajas" }} />
      <Stack.Screen name="cash-registers/form" options={{ title: "Nueva Caja" }} />
      <Stack.Screen name="cash-registers/[id]/index" options={{ title: "Ver Caja" }} />
      <Stack.Screen name="cash-registers/[id]/edit" options={{ title: "Editar Caja" }} />
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
      <Stack.Screen name="users/index" options={{ title: "Todos los usuarios" }} />
      <Stack.Screen name="users/form" options={{ title: "Nuevo usuario" }} />
      <Stack.Screen name="users/[id]/index" options={{ title: "Usuario" }} />
      <Stack.Screen name="users/[id]/edit" options={{ title: "Editar usuario" }} />
      <Stack.Screen
        name="current-location/index"
        options={{
          title: "Mi Sucursal",
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

      <Stack.Screen
        name="suppliers/index"
        options={{
          title: "Proveedores",
        }}
      />
      <Stack.Screen
        name="suppliers/form"
        options={{
          title: "Nuevo Proveedor",
        }}
      />
      <Stack.Screen
        name="suppliers/[id]/index"
        options={{
          title: "Ver Proveedor",
        }}
      />
      <Stack.Screen
        name="suppliers/[id]/edit"
        options={{
          title: "Editar Proveedor",
        }}
      />
      {/* Clientes */}
      <Stack.Screen
        name="clientes/index"
        options={{
          title: "Clientes",
        }}
      />
      <Stack.Screen
        name="clientes/form"
        options={{
          title: "Nuevo Cliente",
        }}
      />
      <Stack.Screen
        name="clientes/[id]/index"
        options={{
          title: "Ver Cliente",
        }}
      />
      <Stack.Screen
        name="clientes/[id]/edit"
        options={{
          title: "Editar Cliente",
        }}
      />
    </Stack>
  );
}
