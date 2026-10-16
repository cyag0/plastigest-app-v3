import { goBack } from "@/utils/navigation";
import AppBar from "@/components/App/AppBar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import palette from "@/constants/palette";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { SaleProvider, useSale } from "./SaleContext";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/home/sales/formv2");

function StackContent() {
  const router = useRouter();
  const pathname = usePathname();
  const { submitting } = useSale();

  const handleBack = () => {
    // Con la venta en envío no se sale: el resultado se perdería.
    if (submitting) return;
    // En la pantalla principal del POS (termina en /formv2) volver al
    // índice de ventas; en cualquier otra ruta (p. ej. scanner) hacer
    // back normal.
    if (pathname.endsWith("/formv2")) {
      router.replace("/(tabs)/home/sales" as any);
    } else {
      goBack();
    }
  };

  const getHeaderRight = () => {
    // Mostrar el acceso al scanner en la pantalla principal del POS.
    if (pathname.endsWith("/formv2")) {
      return () => (
        <AppBar.Action
          icon="barcode-scan"
          iconColor={palette.primary}
          onPress={() =>
            router.push("/(tabs)/home/sales/formv2/scanner" as any)
          }
        />
      );
    }

    return undefined;
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
              onBack={handleBack}
              rightActions={
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {getHeaderRight()?.()}
                  {screenRight?.({} as any)}
                </View>
              }
            />
          );
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "POS - Nueva Venta",
        }}
      />
      <Stack.Screen
        name="scanner"
        options={{
          title: "Escanear Código de Barras",
        }}
      />
    </Stack>
  );
}

export default function _layout() {
  return (
    <SaleProvider>
      <StackContent />
    </SaleProvider>
  );
}
