import LocationSelector from "@/components/LocationSelector";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

/**
 * Wrapper de pantalla completa para `LocationSelector`. El
 * componente en si mismo ya aplica el nuevo diseno SaaS 2025;
 * este archivo solo lo monta dentro de un contenedor con el
 * color de fondo del tema activo.
 */
export default function SelectLocationScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LocationSelector onLocationSelected={() => router.back()} />
    </View>
  );
}
