import { Stack } from "expo-router";

export default function PurchasesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Compras",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="form"
        options={{
          title: "Nueva Compra",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: "Detalle de Compra",
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: "Editar Compra",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
