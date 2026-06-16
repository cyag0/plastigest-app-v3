import AppBar from "@/components/App/AppBar";
import { Stack, usePathname, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { PurchaseProvider } from "./PurchaseContext";

function StackContent() {
  const router = useRouter();
  const pathname = usePathname();

  const handleBack = () => {
    if (pathname.endsWith("/formv2")) {
      router.replace("/(tabs)/home/purchases/index" as any);
    } else {
      router.back();
    }
  };

  return (
    <Stack
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
