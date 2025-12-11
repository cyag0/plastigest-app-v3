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
      <Stack.Screen
        name="transfers-menu/index"
        options={{
          title: "Transferencias",
        }}
      />
      <Stack.Screen
        name="petitions/index"
        options={{
          title: "Solicitudes de Transferencia",
        }}
      />
      <Stack.Screen
        name="petitions/[id]"
        options={{
          title: "Detalle de Solicitud de Transferencia",
        }}
      />

      <Stack.Screen
        name="petitions/form"
        options={{
          title: "Nueva Solicitud de Transferencia",
        }}
      />

      <Stack.Screen
        name="receipts/index"
        options={{
          title: "Solicitudes Recibidas",
        }}
      />
      <Stack.Screen
        name="receipts/[id]"
        options={{
          title: "Detalle de Solicitud Recibida",
        }}
      />

      <Stack.Screen
        name="shipments/index"
        options={{
          title: "Envíos Realizados",
        }}
      />
      <Stack.Screen
        name="shipments/[id]"
        options={{
          title: "Detalle de Envío Realizado",
        }}
      />
      <Stack.Screen
        name="transfers/index"
        options={{
          title: "Envíos Recibidos",
        }}
      />
      <Stack.Screen
        name="transfers/[id]"
        options={{
          title: "Detalle de Envío Recibido",
        }}
      />

      <Stack.Screen
        name="sales-reports/index"
        options={{
          title: "Reportes de Ventas",
        }}
      />
      <Stack.Screen
        name="sales-reports/form"
        options={{
          title: "Nuevo Reporte de Ventas",
        }}
      />
      <Stack.Screen
        name="sales-reports/[id]"
        options={{
          title: "Detalle de Reporte de Ventas",
        }}
      />
    </Stack>
  );
}
