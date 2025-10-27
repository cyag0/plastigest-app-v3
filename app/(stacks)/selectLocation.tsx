import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";

interface Location {
  id: number;
  name: string;
  description?: string;
  address: string;
  phone?: string;
  email?: string;
  company_id: number;
  company_name?: string;
  is_active: boolean;
}

export default function SelectLocationScreen() {
  const router = useRouter();
  const {
    locations,
    selectedLocation: currentLocation,
    selectLocation,
    isLoadingLocations,
    loadLocations,
  } = useSelectedLocation();

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    currentLocation?.id || null
  );
  const [loading, setLoading] = useState(false);

  // Cargar ubicaciones al montar el componente
  useEffect(() => {
    if (locations.length === 0) {
      loadLocations();
    }
  }, []);

  // Actualizar selección cuando cambie la ubicación actual
  useEffect(() => {
    if (currentLocation) {
      setSelectedLocationId(currentLocation.id);
    }
  }, [currentLocation]);

  const handleSelectLocation = async (locationId: number) => {
    try {
      setLoading(true);

      const locationToSelect = locations.find((l) => l.id === locationId);
      if (!locationToSelect) {
        Alert.alert("Error", "Ubicación no encontrada");
        return;
      }

      // Seleccionar la ubicación usando el hook
      await selectLocation(locationToSelect);

      Alert.alert(
        "Ubicación seleccionada",
        `Has cambiado a ${locationToSelect.name}`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo cambiar de ubicación. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const getLocationInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getCurrentLocationName = () => {
    return currentLocation?.name || "Ninguna";
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.currentLocationContainer}>
          <Text variant="labelLarge" style={styles.currentLocationLabel}>
            Ubicación actual: {getCurrentLocationName()}
          </Text>
        </View>

        {isLoadingLocations ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Cargando ubicaciones...
            </Text>
          </View>
        ) : locations.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No hay ubicaciones disponibles para esta compañía
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Contacta al administrador para crear ubicaciones
            </Text>
          </View>
        ) : (
          locations.map((location) => {
            const isCurrentLocation = currentLocation?.id === location.id;
            const isSelected = selectedLocationId === location.id;

            return (
              <Card
                key={location.id}
                style={[
                  styles.locationCard,
                  isSelected && styles.selectedCard,
                  isCurrentLocation && styles.currentCard,
                ]}
                onPress={() => setSelectedLocationId(location.id)}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.locationContent}>
                    {/* Avatar */}
                    <View style={styles.logoContainer}>
                      <Avatar.Text
                        size={50}
                        label={getLocationInitials(location.name)}
                        style={[
                          styles.avatar,
                          isCurrentLocation && styles.currentAvatar,
                        ]}
                      />
                    </View>

                    {/* Location info */}
                    <View style={styles.locationInfo}>
                      <View style={styles.locationHeader}>
                        <Text variant="titleMedium" style={styles.locationName}>
                          {location.name}
                        </Text>
                        {isCurrentLocation && (
                          <Chip
                            style={styles.currentBadge}
                            textStyle={styles.currentBadgeText}
                            compact
                          >
                            ACTUAL
                          </Chip>
                        )}
                      </View>

                      {location.description && (
                        <Text variant="bodyMedium" style={styles.description}>
                          {location.description}
                        </Text>
                      )}

                      {/* Details */}
                      <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                          <Text style={styles.label}>📍 Dirección:</Text>
                          <Text style={styles.value}>{location.address}</Text>
                        </View>
                        {location.phone && (
                          <View style={styles.detailRow}>
                            <Text style={styles.label}>📞 Teléfono:</Text>
                            <Text style={styles.value}>{location.phone}</Text>
                          </View>
                        )}
                        {location.email && (
                          <View style={styles.detailRow}>
                            <Text style={styles.label}>📧 Email:</Text>
                            <Text style={styles.value}>{location.email}</Text>
                          </View>
                        )}
                      </View>

                      {/* Status badge */}
                      <Chip
                        style={[
                          styles.statusBadge,
                          location.is_active
                            ? styles.activeBadge
                            : styles.inactiveBadge,
                        ]}
                        textStyle={[
                          styles.statusBadgeText,
                          location.is_active
                            ? styles.activeText
                            : styles.inactiveText,
                        ]}
                        compact
                      >
                        {location.is_active ? "✓ Activa" : "✗ Inactiva"}
                      </Chip>
                    </View>

                    {/* Selection indicator */}
                    {isSelected && (
                      <View style={styles.selectionIndicator}>
                        <Avatar.Icon
                          size={40}
                          icon="check-circle"
                          style={styles.checkIcon}
                        />
                      </View>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}

        {/* Action button */}
        {selectedLocationId && selectedLocationId !== currentLocation?.id && (
          <Button
            mode="contained"
            onPress={() => handleSelectLocation(selectedLocationId)}
            style={styles.actionButton}
            buttonColor={palette.primary}
            textColor="#fff"
            icon="map-marker"
            loading={loading}
            disabled={loading}
          >
            {loading ? "Cambiando ubicación..." : "Confirmar cambio"}
          </Button>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Puedes cambiar de ubicación en cualquier momento desde tu perfil.
            {"\n"}
            Los datos de inventario mostrados corresponderán a la ubicación
            seleccionada.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  currentLocationContainer: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: palette.secondary,
  },
  currentLocationLabel: {
    textAlign: "center",
    fontWeight: "600",
    color: palette.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  emptyText: {
    color: palette.textSecondary,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    color: palette.textSecondary,
    opacity: 0.6,
    textAlign: "center",
    fontSize: 12,
  },
  locationCard: {
    marginBottom: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  selectedCard: {
    borderColor: palette.secondary,
    borderWidth: 2,
  },
  currentCard: {
    backgroundColor: palette.surface,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  locationContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logoContainer: {
    marginRight: 12,
    justifyContent: "center",
  },
  avatar: {
    backgroundColor: palette.secondary,
  },
  currentAvatar: {
    backgroundColor: palette.accent,
  },
  locationInfo: {
    flex: 1,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locationName: {
    fontWeight: "bold",
    color: palette.text,
    flex: 1,
  },
  currentBadge: {
    backgroundColor: palette.secondary,
    marginLeft: 8,
  },
  currentBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
  },
  description: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
    marginBottom: 8,
  },
  detailsContainer: {
    gap: 4,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.textSecondary,
    marginRight: 6,
    minWidth: 80,
  },
  value: {
    fontSize: 12,
    color: palette.text,
    flex: 1,
  },
  statusBadge: {
    alignSelf: "flex-start",
  },
  activeBadge: {
    backgroundColor: palette.success,
  },
  inactiveBadge: {
    backgroundColor: palette.error,
  },
  statusBadgeText: {
    fontWeight: "600",
    fontSize: 11,
  },
  activeText: {
    color: "#fff",
  },
  inactiveText: {
    color: "#fff",
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  checkIcon: {
    backgroundColor: palette.secondary,
  },
  actionButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  footerText: {
    color: palette.textSecondary,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 18,
  },
});
