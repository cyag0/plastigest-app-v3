import AppBar from "@/components/App/AppBar";
import palette from "@/constants/palette";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { SaleProvider } from "./SaleContext";

function StackContent() {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    // En la pantalla principal del POS (termina en /formv2) volver al
    // índice de ventas; en cualquier otra ruta (p. ej. scanner) hacer
    // back normal.
    if (pathname.endsWith("/formv2")) {
      router.replace("/(tabs)/home/sales/index" as any);
    } else {
      router.back();
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
      screenOptions={{
        headerShown: true,
        header: (props) => {
          const { options, route } = props;

          return (
            <AppBar
              title={options.title || route.name}
              showSearchButton={false}
              onBack={handleBack}
              rightActions={getHeaderRight()?.()}
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
