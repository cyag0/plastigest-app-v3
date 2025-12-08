import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface LocationSelectorProps {
  onLocationSelected?: () => void;
}

export default function LocationSelector({
  onLocationSelected,
}: LocationSelectorProps) {
  const router = useRouter();
  const alerts = useAlerts();
  const {
    selectedCompany,
    location: currentLocation,
    selectLocation,
  } = useAuth();
  const [locations, setLocations] = useState<App.Entities.Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      loadLocations();
    }
  }, [selectedCompany]);

  const loadLocations = async () => {
    if (!selectedCompany) return;

    try {
      setIsLoadingLocations(true);
      const response = await Services.admin.locations.index({
        company_id: selectedCompany.id,
        is_active: 1,
      });

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setLocations(data);

      // Si hay solo una ubicación y no hay ninguna seleccionada, seleccionarla automáticamente
      if (data.length === 1 && !currentLocation) {
        await handleSelectLocation(data[0].id);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleSelectLocation = async (locationId: number) => {
    const locationToSelect = locations.find((l) => l.id === locationId);
    if (!locationToSelect) {
      alerts.error("Ubicación no encontrada");
      return;
    }

    // Si ya es la ubicación actual, no hacer nada
    if (currentLocation?.id === locationId) {
      return;
    }

    const confirmed = await alerts.confirm(
      `¿Cambiar a ${locationToSelect.name}?`,
      {
        title: "Confirmar Cambio",
        okText: "Cambiar",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // Seleccionar la ubicación usando el contexto
      await selectLocation(locationToSelect);

      alerts.success(`Has cambiado a ${locationToSelect.name}`);

      // Callback si existe, de lo contrario no hacer nada
      // (el wrapper se actualizará automáticamente al detectar la ubicación)
      if (onLocationSelected) {
        onLocationSelected();
      }
    } catch (error) {
      alerts.error("No se pudo cambiar de ubicación. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCompany) {
    return (
      <Card style={styles.emptyCard}>
        <Card.Content style={styles.emptyContent}>
          <MaterialCommunityIcons
            name="office-building-outline"
            size={64}
            color={palette.textSecondary}
            style={{ opacity: 0.5 }}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Selecciona una compañía primero
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (isLoadingLocations) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text variant="bodyMedium" style={styles.loadingText}>
          Cargando ubicaciones...
        </Text>
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons
              name="map-marker-off-outline"
              size={64}
              color={palette.textSecondary}
              style={{ opacity: 0.5 }}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No hay ubicaciones disponibles
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              Contacta al administrador para crear ubicaciones
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <IconButton
              icon="map-marker"
              size={32}
              iconColor={palette.secondary}
              style={{ margin: 0 }}
            />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Selecciona tu Ubicación
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Cambia entre las ubicaciones de {selectedCompany.name}
          </Text>
        </View>

        {/* Current Location Badge */}
        {currentLocation && (
          <Card style={styles.currentLocationCard}>
            <Card.Content style={styles.currentLocationContent}>
              <View style={styles.currentLocationIcon}>
                <IconButton
                  icon="check-circle"
                  size={20}
                  iconColor={palette.secondary}
                  style={{ margin: 0 }}
                />
              </View>
              <View style={styles.currentLocationText}>
                <Text variant="labelSmall" style={styles.currentLocationLabel}>
                  UBICACIÓN ACTUAL
                </Text>
                <Text variant="titleMedium" style={styles.currentLocationName}>
                  {currentLocation.name}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Locations Grid */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Selecciona una Ubicación
        </Text>
        <View style={styles.locationsGrid}>
          {locations.map((location) => {
            const isCurrentLocation = currentLocation?.id === location.id;

            return (
              <Card
                key={location.id}
                style={[
                  styles.locationActionCard,
                  isCurrentLocation
                    ? styles.currentLocationActionCard
                    : styles.availableLocationActionCard,
                ]}
                onPress={() => {
                  if (!isCurrentLocation && !loading) {
                    handleSelectLocation(location.id);
                  }
                }}
                disabled={loading}
              >
                <Card.Content style={styles.locationActionContent}>
                  {/* Icon */}
                  <View style={styles.locationIconContainer}>
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={40}
                      color={
                        isCurrentLocation ? palette.secondary : palette.primary
                      }
                    />
                    {isCurrentLocation && (
                      <View style={styles.currentBadgeIcon}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={palette.secondary}
                        />
                      </View>
                    )}
                  </View>

                  {/* Location Name */}
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.locationActionName,
                      {
                        color: isCurrentLocation
                          ? palette.secondary
                          : palette.primary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {location.name}
                  </Text>

                  {/* Description */}
                  {location.description && (
                    <Text
                      variant="bodySmall"
                      style={styles.locationActionDescription}
                      numberOfLines={2}
                    >
                      {location.description}
                    </Text>
                  )}

                  {/* Status Badge */}
                  {isCurrentLocation && (
                    <View style={styles.currentBadge}>
                      <Text
                        variant="labelSmall"
                        style={styles.currentBadgeText}
                      >
                        ACTUAL
                      </Text>
                    </View>
                  )}

                  {/* Address */}
                  <View style={styles.addressContainer}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={14}
                      color={palette.textSecondary}
                      style={{ opacity: 0.6 }}
                    />
                    <Text
                      variant="labelSmall"
                      style={styles.locationActionAddress}
                    >
                      {location.address}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>

        {/* Footer Info */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={palette.blue}
            />
            <Text variant="bodySmall" style={styles.infoText}>
              Los datos de inventario y reportes mostrados corresponderán a la
              ubicación seleccionada.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerIcon: {
    backgroundColor: palette.secondary + "15",
    borderRadius: 50,
    padding: 8,
    marginBottom: 12,
  },
  title: {
    color: palette.text,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.85,
  },
  currentLocationCard: {
    backgroundColor: palette.secondary + "10",
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: palette.secondary,
    shadowColor: "transparent",
  },
  currentLocationContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  currentLocationIcon: {
    marginRight: 12,
  },
  currentLocationText: {
    flex: 1,
  },
  currentLocationLabel: {
    color: palette.secondary,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  currentLocationName: {
    color: palette.text,
    fontWeight: "600",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    marginTop: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    color: palette.text,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
  sectionTitle: {
    color: palette.textSecondary,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  locationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  locationActionCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
    elevation: 2,
  },
  currentLocationActionCard: {
    backgroundColor: palette.secondary + "15",
    borderWidth: 2,
    borderColor: palette.secondary + "40",
  },
  availableLocationActionCard: {
    backgroundColor: palette.primary + "15",
    borderWidth: 1,
    borderColor: palette.primary + "20",
  },
  locationActionContent: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 8,
  },
  locationIconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  currentBadgeIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: palette.surface,
    borderRadius: 10,
  },
  locationActionName: {
    fontWeight: "bold",
    textAlign: "center",
    minHeight: 44,
  },
  locationActionDescription: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.8,
  },
  currentBadge: {
    backgroundColor: palette.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  currentBadgeText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationActionAddress: {
    color: palette.textSecondary,
    opacity: 0.6,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: palette.blue + "10",
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: palette.blue,
    shadowColor: "transparent",
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: palette.textSecondary,
    lineHeight: 18,
  },
});
