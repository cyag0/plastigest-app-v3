import { Stack } from "expo-router";
import React from "react";
import { PurchaseProvider } from "./PurchaseContext";

export default function PurchaseFormLayout() {
  return (
    <PurchaseProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="productos" />
        <Stack.Screen name="carrito" />
      </Stack>
    </PurchaseProvider>
  );
}
