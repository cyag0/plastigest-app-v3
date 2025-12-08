import AppBar from "@/components/App/AppBar";
import { router, Stack } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: (props) => {
          const { options, route } = props;
          const right = options.headerRight;

          function rightActions() {
            return right ? right() : null;
          }

          return (
            <AppBar
              title={options.title || route.name}
              showSearchButton={false}
              onNotificationPress={() =>
                router.push("/(tabs)/home/notifications")
              }
              onProfilePress={() => console.log("Profile pressed")}
              rightActions={rightActions()}
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Inicio",
        }}
      />
      <Stack.Screen name="roles" />
      <Stack.Screen
        name="notifications/index"
        options={{
          title: "Notificaciones",
        }}
      />
      <Stack.Screen
        name="notifications/[id]"
        options={{
          title: "Detalle de la Notificación",
        }}
      />
      <Stack.Screen name="locations" />
      <Stack.Screen name="users" />
      <Stack.Screen name="workers" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="products" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen
        name="purchases/index"
        options={{
          title: "Compras",
        }}
      />

      <Stack.Screen
        name="purchases/form"
        options={{
          title: "Nueva Compra",
        }}
      />

      <Stack.Screen
        name="purchases/[id]"
        options={{
          title: "Ver Compra",
        }}
      />
      <Stack.Screen
        name="purchases/formv2"
        options={{
          title: "Nueva Compra",
        }}
      />
      <Stack.Screen
        name="production/index"
        options={{
          title: "Producción",
        }}
      />
      <Stack.Screen
        name="production/form"
        options={{
          title: "Nueva Producción",
        }}
      />
      <Stack.Screen
        name="production/[id]/edit"
        options={{
          title: "Editar Producción",
        }}
      />
      <Stack.Screen
        name="production/[id]/index"
        options={{
          title: "Ver Producción",
        }}
      />

      <Stack.Screen
        name="sales/index"
        options={{
          title: "Ventas",
        }}
      />
      <Stack.Screen
        name="sales/form"
        options={{
          title: "Nueva Venta",
        }}
      />
      <Stack.Screen
        name="sales/formv2"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sales/[id]/edit"
        options={{
          title: "Editar Venta",
        }}
      />
      <Stack.Screen
        name="sales/[id]/index"
        options={{
          title: "Ver Venta",
        }}
      />

      <Stack.Screen
        name="adjustment/index"
        options={{
          title: "Ajustes de Inventario",
        }}
      />
      <Stack.Screen
        name="adjustment/form"
        options={{
          title: "Nuevo Ajuste",
        }}
      />
      <Stack.Screen
        name="adjustment/[id]/edit"
        options={{
          title: "Editar Ajuste",
        }}
      />
      <Stack.Screen
        name="adjustment/[id]/index"
        options={{
          title: "Ver Ajuste",
        }}
      />
    </Stack>
  );
}
