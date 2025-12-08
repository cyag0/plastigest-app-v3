import AppBar from "@/components/App/AppBar";
import { POSProvider } from "@/components/Views/POSV2/Context";
import palette from "@/constants/palette";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";

function StackContent() {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    const isIndexOrProductsRoute =
      pathname.includes("/productos") || pathname.endsWith("/formv2");

    if (isIndexOrProductsRoute) {
      // Si está en index o productos, volver al índice de ventas
      router.replace("/(tabs)/home/sales/index" as any);
    } else {
      // En cualquier otra ruta, hacer back normal
      router.back();
    }
  };

  const getHeaderRight = () => {
    const isProductsRoute = pathname.includes("/productos");

    if (isProductsRoute) {
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
        name="productos"
        options={{
          title: "Productos",
        }}
      />
      <Stack.Screen
        name="carrito"
        options={{
          title: "Carrito de Ventas",
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
    <POSProvider type="sales">
      <StackContent />
    </POSProvider>
  );
}
