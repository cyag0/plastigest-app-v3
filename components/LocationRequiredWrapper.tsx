import LocationSelector from "@/components/LocationSelector";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

interface LocationRequiredWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper que verifica si hay una ubicación seleccionada
 * Si no hay ubicación, muestra el selector de ubicaciones
 * Requiere que ya esté seleccionada una compañía
 */
export default function LocationRequiredWrapper({
  children,
}: LocationRequiredWrapperProps) {
  const { selectedCompany, location } = useAuth();

  // Si no hay compañía seleccionada, no mostrar nada (debería usar CompanyRequiredWrapper primero)
  if (!selectedCompany) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={styles.message}>
          Debes seleccionar una compañía primero
        </Text>
      </View>
    );
  }

  // Si no hay ubicación seleccionada, mostrar el selector
  if (!location) {
    return (
      <View style={styles.container}>
        <LocationSelector onLocationSelected={() => {}} />
      </View>
    );
  }

  // Si hay ubicación seleccionada, mostrar el contenido
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  message: {
    textAlign: "center",
    marginTop: 50,
    color: palette.textSecondary,
  },
});
