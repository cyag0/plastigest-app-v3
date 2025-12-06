import { Stack } from "expo-router";

export default function TransfersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="shipments" />
      <Stack.Screen name="receipts" />
    </Stack>
  );
}

