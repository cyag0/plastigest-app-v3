import AppBar from "@/components/App/AppBar";
import { Stack } from "expo-router";
import React from "react";

export default function _layout() {
  return (
    <Stack
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
              onSearchPress={() => console.log("Search pressed")}
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
        name="weekly-inventory"
        options={{ title: "Inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/index"
        options={{ title: "Inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/form"
        options={{ title: "Crear Inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/[id]/edit"
        options={{ title: "Editar Inventario", headerShown: true }}
      />
      <Stack.Screen
        name="weekly-inventory/[id]/index"
        options={{ title: "Detalle Inventario", headerShown: true }}
      />

      <Stack.Screen name="products" options={{ title: "Productos" }} />
      <Stack.Screen name="products/index" options={{ title: "Productos" }} />
      <Stack.Screen
        name="products/form"
        options={{ title: "Nuevo Producto" }}
      />
      <Stack.Screen
        name="products/[id]/index"
        options={{ title: "Detalle del Producto" }}
      />
      <Stack.Screen
        name="products/[id]/edit"
        options={{ title: "Editar Producto" }}
      />
      <Stack.Screen name="adjustment/index" options={{ title: "Ajustes" }} />
      <Stack.Screen
        name="adjustment/form"
        options={{ title: "Crear Ajuste" }}
      />
      <Stack.Screen
        name="adjustment/[id]/index"
        options={{ title: "Detalle Ajuste" }}
      />
      <Stack.Screen
        name="adjustment/[id]/edit"
        options={{ title: "Editar Ajuste" }}
      />
    </Stack>
  );
}
