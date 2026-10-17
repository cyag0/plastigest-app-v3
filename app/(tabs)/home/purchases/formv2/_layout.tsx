import { goBack } from "@/utils/navigation";
import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { PurchaseProvider } from "./PurchaseContext";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/home/purchases/formv2");

// La compra es una sola pantalla (catálogo y carrito juntos): atrás sale de
// ella, a la lista o a donde se abrió (como Reabastecimiento). Antes también
// estaban productos y carrito, y atrás regresaba al formulario.
const handleBack = () => goBack("/(tabs)/home/purchases");

function StackContent() {
  return (
    <Stack
      screenLayout={screenLayout}
      screenOptions={{
        headerShown: true,
        header: (props) => {
          const { options, route } = props;
          const screenRight = options.headerRight;

          return (
            <AppBar
              title={options.title || route.name}
              showSearchButton={false}
              onBack={handleBack}
              rightActions={
                screenRight ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {screenRight({} as any)}
                  </View>
                ) : undefined
              }
            />
          );
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Nueva compra" }} />
    </Stack>
  );
}

export default function PurchaseFormLayout() {
  return (
    <PurchaseProvider>
      <StackContent />
    </PurchaseProvider>
  );
}
