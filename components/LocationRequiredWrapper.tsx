import palette from "@/constants/palette";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

interface LocationRequiredWrapperProps {
  children: React.ReactNode;
  showLocationButton?: boolean;
  customMessage?: string;
}

/**
 * Wrapper que verifica si hay una ubicación seleccionada
 * Si no hay ubicación, muestra una pantalla para seleccionar una
 * Requiere que ya esté seleccionada una compañía
 */
export default function LocationRequiredWrapper({
  children,
  showLocationButton = true,
  customMessage,
}: LocationRequiredWrapperProps) {
  const router = useRouter();
  const { company } = useSelectedCompany();
  const { selectedLocation, locations, isLoadingLocations, loadLocations } =
    useSelectedLocation();

  // Si no hay compañía seleccionada, no mostrar nada (debería usar CompanyRequiredWrapper primero)
  if (!company) {
    return (
      <View style={styles.container}>
        <Text variant="bodyLarge" style={styles.message}>
          Debes seleccionar una compañía primero
        </Text>
      </View>
    );
  }

  // Mostrar loading mientras se cargan las ubicaciones
  if (isLoadingLocations) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Cargando ubicaciones...
        </Text>
      </View>
    );
  }

  // Si no hay ubicaciones disponibles
  if (locations.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          📍 Sin Ubicaciones
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          No hay ubicaciones disponibles para esta compañía.
          {"\n"}
          Contacta al administrador para crear ubicaciones.
        </Text>
        <Button
          mode="outlined"
          onPress={() => loadLocations()}
          style={styles.button}
          icon="refresh"
        >
          Actualizar
        </Button>
      </View>
    );
  }

  // Si hay ubicaciones pero no hay ninguna seleccionada
  if (!selectedLocation) {
    return (
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          📍 Seleccionar Ubicación
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          {customMessage ||
            `Para continuar, necesitas seleccionar una ubicación de trabajo.
            \nTienes ${locations.length} ubicación${
              locations.length > 1 ? "es" : ""
            } disponible${locations.length > 1 ? "s" : ""}.`}
        </Text>

        {showLocationButton && (
          <Button
            mode="contained"
            onPress={() => router.push("/(stacks)/selectLocation")}
            style={styles.button}
            icon="map-marker"
            buttonColor={palette.secondary}
          >
            Seleccionar Ubicación
          </Button>
        )}

        <Button
          mode="outlined"
          onPress={() => loadLocations()}
          style={styles.button}
          icon="refresh"
        >
          Actualizar Lista
        </Button>
      </View>
    );
  }

  // Si hay ubicación seleccionada, mostrar el contenido
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: palette.background,
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "bold",
    color: palette.text,
  },
  message: {
    textAlign: "center",
    marginBottom: 24,
    color: palette.textSecondary,
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  button: {
    marginBottom: 12,
    minWidth: 200,
  },
});
