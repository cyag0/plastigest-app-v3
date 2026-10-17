import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";
import React from "react";

// Si una pantalla de esta sección truena, sólo se reemplaza la sección
// (el menú y el resto de la app siguen) y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/inventory");

export default function _layout() {
  return (
    <Stack
      screenLayout={screenLayout}
      screenOptions={{
        headerShown: true,
        header: ({ options, route }) => {
          const isIndex = route.name === "index";

          /* header: (props) => {
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
                  }, */

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
              showBackButton={!isIndex}
              rightActions={rightActions()}
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Inventario",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="kardex"
        options={{
          title: "Kárdex",
        }}
      />
      <Stack.Screen
        name="weekly-inventory/index"
        options={{ title: "Inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/form"
        options={{ title: "Nuevo inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/[id]/edit"
        options={{ title: "Editar inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/[id]/index"
        options={{ title: "Inventario", headerShown: true }}
      />

      <Stack.Screen
        name="products/index"
        options={{ title: "Tipos de inventario" }}
      />
      <Stack.Screen
        name="products/type/[slug]/index"
        options={{ title: "Productos" }}
      />
      <Stack.Screen
        name="products/type/[slug]/form"
        options={{ title: "Nuevo producto" }}
      />
      <Stack.Screen
        name="products/form"
        options={{ title: "Nuevo producto" }}
      />
      <Stack.Screen
        name="products/[id]/index"
        options={{ title: "Producto" }}
      />
      <Stack.Screen
        name="products/[id]/edit"
        options={{ title: "Editar producto" }}
      />
      <Stack.Screen
        name="products/[id]/movements"
        options={{ title: "Movimientos de inventario" }}
      />
      <Stack.Screen
        name="packages/index"
        options={{ title: "Paquetes" }}
      />
      <Stack.Screen
        name="packages/form"
        options={{ title: "Nuevo paquete" }}
      />
      <Stack.Screen
        name="packages/[id]/index"
        options={{ title: "Paquete" }}
      />
      <Stack.Screen
        name="packages/[id]/edit"
        options={{ title: "Editar paquete" }}
      />
      <Stack.Screen name="adjustment/index" options={{ title: "Ajustes" }} />
      <Stack.Screen
        name="adjustment/form"
        options={{ title: "Nuevo ajuste" }}
      />
      <Stack.Screen
        name="adjustment/[id]/index"
        options={{ title: "Ajuste" }}
      />
      <Stack.Screen
        name="adjustment/[id]/edit"
        options={{ title: "Editar ajuste" }}
      />
    </Stack>
  );
}
