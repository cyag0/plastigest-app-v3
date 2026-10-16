import { goBack } from "@/utils/navigation";
import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { PurchaseProvider } from "./PurchaseContext";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/home/purchases/formv2");

function StackContent() {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    if (pathname.endsWith("/formv2")) {
      router.replace("/(tabs)/home/purchases/index" as any);
    } else {
      goBack();
    }
  };

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
              showBackButton={!pathname.endsWith("/formv2")}
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
      <Stack.Screen name="index" options={{ title: "Nueva Compra" }} />
      <Stack.Screen name="productos" options={{ title: "Agregar Productos" }} />
      <Stack.Screen name="carrito" options={{ title: "Carrito de Compra" }} />
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
