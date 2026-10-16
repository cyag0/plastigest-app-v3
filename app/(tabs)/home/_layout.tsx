import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

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
            return right ? right({} as any) : null;
          }

          return (
            <AppBar
              title={options.title || route.name}
              showSearchButton={false}
              showBackButton={!isIndex}
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
      <Stack.Screen
        name="roles/index"
        options={{
          title: "Roles",
        }}
      />
      <Stack.Screen
        name="roles/form"
        options={{
          title: "Nuevo Rol",
        }}
      />
      <Stack.Screen
        name="roles/[id]/index"
        options={{
          title: "Ver Rol",
        }}
      />
      <Stack.Screen
        name="roles/[id]/edit"
        options={{
          title: "Editar Rol",
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
          title: "Detalle de la Notificación",
        }}
      />
      <Stack.Screen name="locations" />
      <Stack.Screen
        name="cash/index"
        options={{
          title: "Caja",
        }}
      />
      <Stack.Screen
        name="cash/form"
        options={{
          title: "Nuevo Movimiento",
        }}
      />
      <Stack.Screen
        name="cash/sessions/index"
        options={{ title: "Turnos de caja" }}
      />
      <Stack.Screen
        name="cash/sessions/[id]/index"
        options={{ title: "Detalle de turno" }}
      />
      <Stack.Screen
        name="cash/closing/index"
        options={{ title: "Cierres anteriores" }}
      />
      <Stack.Screen
        name="cash/closing/[id]/index"
        options={{ title: "Detalle de Cierre" }}
      />
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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="production/index"
        options={{
          title: "Producción",
          animation: "none",
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
        name="production/[id]/packaging"
        options={{
          title: "Empacar Producción",
        }}
      />
      <Stack.Screen
        name="production/formulas/index"
        options={{
          title: "Fórmulas",
          animation: "none",
        }}
      />
      <Stack.Screen
        name="production/formulas/form"
        options={{
          title: "Nueva Fórmula",
        }}
      />

      <Stack.Screen
        name="sales/index"
        options={{
          title: "Ventas",
        }}
      />
      <Stack.Screen
        name="sales-orders/index"
        options={{
          title: "Pedidos",
        }}
      />
      <Stack.Screen
        name="sales-orders/[id]"
        options={{
          title: "Detalle de Pedido",
        }}
      />
      <Stack.Screen
        name="sales-orders/kiosk"
        options={{
          title: "Modo Quiosco",
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
        name="transfers/formv2/index"
        options={{
          title: "Nueva Solicitud de Transferencia",
        }}
      />
      <Stack.Screen
        name="transfers/suggestions/index"
        options={{
          title: "Qué pedir",
        }}
      />
      <Stack.Screen
        name="transfers/pending/index"
        options={{
          title: "Solicitudes Pendientes",
        }}
      />
      <Stack.Screen
        name="transfers/history/index"
        options={{
          title: "Historial de Transferencias",
        }}
      />
      <Stack.Screen
        name="transfers/[id]"
        options={{
          title: "Detalle de Envío Recibido",
        }}
      />

      <Stack.Screen
        name="business-reports/index"
        options={{
          title: "Reportes del negocio",
        }}
      />
    </Stack>
  );
}
