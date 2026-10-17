import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import { Stack } from "expo-router";
import React from "react";
import { PurchaseProvider } from "./PurchaseContext";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…".
const screenLayout = routeGuardLayout("(tabs)/home/purchases/formv2");

// La compra es una sola pantalla (catálogo y carrito juntos) y pinta su
// propia barra de arriba: en tableta y escritorio lleva el proveedor y el
// buscador del catálogo, que dependen del estado de la pantalla.
function StackContent() {
  return (
    <Stack screenLayout={screenLayout} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
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
