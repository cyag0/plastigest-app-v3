import EmptyState from "@/components/App/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { tokens } from "@/constants/tokens";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

interface LocationSelectorProps {
  onLocationSelected?: () => void;
}

/**
 * Selector de sucursal en formato lista (estilo SaaS 2025):
 * header con titulo + empresa actual, listado de sucursales como
 * cards con icono y badge "ACTUAL" para la seleccionada, footer
 * informativo. Pensado para usarse:
 *  - Como pantalla completa (en `/(stacks)/selectLocation`)
 *  - Como bloque embebido (en `LocationRequiredWrapper` durante el
 *    bootstrap cuando todavia no hay sucursal elegida)
 */
export default function LocationSelector({
  onLocationSelected,
}: LocationSelectorProps) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id]);

  const loadLocations = async () => {
    if (!selectedCompany) return;
    try {
      setIsLoadingLocations(true);
      const response = await Services.admin.locations.index({
        company_id: selectedCompany.id,
        is_active: true,
      });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setLocations(data);

      // Si hay solo una ubicacion y no hay ninguna seleccionada,
      // seleccionarla automaticamente.
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
      alerts.error("Ubicacion no encontrada");
      return;
    }
    if (currentLocation?.id === locationId) return;

    const confirmed = await alerts.confirm(
      `¿Cambiar a ${locationToSelect.name}?`,
      { title: "Confirmar Cambio", okText: "Cambiar", cancelText: "Cancelar" }
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await selectLocation(locationToSelect);
      alerts.success(`Has cambiado a ${locationToSelect.name}`);
      onLocationSelected?.();
    } catch {
      alerts.error("No se pudo cambiar de ubicacion. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: tokens.spacing[5],
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
      gap: tokens.spacing[5],
    },
    header: {
      alignItems: "center",
      gap: tokens.spacing[2],
    },
    headerIconBox: {
      width: 56,
      height: 56,
      borderRadius: tokens.radius.full,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      ...tokens.typography.h1,
      color: colors.text,
      textAlign: "center",
    },
    subtitle: {
      ...tokens.typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    currentCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      padding: tokens.spacing[4],
      backgroundColor: colors.successSoft,
      borderRadius: tokens.radius.lg,
      borderLeftWidth: 3,
      borderLeftColor: colors.success,
    },
    currentIconBox: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.full,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    currentBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    currentLabel: {
      ...tokens.typography.micro,
      color: colors.success,
      letterSpacing: 0.6,
    },
    currentName: {
      ...tokens.typography.bodyMd,
      color: colors.text,
      fontWeight: "600",
    },
    sectionLabel: {
      ...tokens.typography.micro,
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    list: {
      gap: tokens.spacing[2],
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      padding: tokens.spacing[4],
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionIconBox: {
      width: 40,
      height: 40,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    optionIconBoxActive: {
      backgroundColor: colors.surface,
    },
    optionBody: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    optionTitle: {
      ...tokens.typography.bodyMd,
      color: colors.text,
      fontWeight: "600",
    },
    optionSubtitle: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
    },
    optionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: tokens.spacing[2],
      paddingVertical: 2,
      borderRadius: tokens.radius.full,
      backgroundColor: colors.successSoft,
    },
    optionBadgeText: {
      ...tokens.typography.micro,
      color: colors.success,
      fontWeight: "700",
    },
    loadingBox: {
      alignItems: "center",
      paddingVertical: tokens.spacing[7],
      gap: tokens.spacing[2],
    },
    loadingText: {
      ...tokens.typography.body,
      color: colors.textSecondary,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.spacing[2],
      padding: tokens.spacing[3],
      backgroundColor: colors.infoSoft,
      borderRadius: tokens.radius.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.info,
    },
    infoText: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 16,
    },
  }));

  if (!selectedCompany) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="office-building-outline"
          title="Selecciona una compania primero"
          description="Debes elegir una empresa antes de poder ver sus sucursales"
        />
      </View>
    );
  }

  if (isLoadingLocations) {
    return (
      <View style={[styles.container, styles.loadingBox]}>
        <ActivityIndicator size="large" color={styles.title.color} />
        <Text style={styles.loadingText}>Cargando sucursales...</Text>
      </View>
    );
  }

  if (locations.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="map-marker-off-outline"
          title="Sin sucursales disponibles"
          description="Contacta al administrador para crear sucursales"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons
              name="map-marker"
              size={28}
              color={styles.optionBadgeText.color}
            />
          </View>
          <Text style={styles.title}>Selecciona tu sucursal</Text>
          <Text style={styles.subtitle}>
            Cambia entre las ubicaciones de {selectedCompany.name}
          </Text>
        </View>

        {currentLocation && (
          <View style={styles.currentCard}>
            <View style={styles.currentIconBox}>
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={styles.optionBadgeText.color}
              />
            </View>
            <View style={styles.currentBody}>
              <Text style={styles.currentLabel}>SUCURSAL ACTUAL</Text>
              <Text style={styles.currentName} numberOfLines={1}>
                {currentLocation.name}
              </Text>
            </View>
          </View>
        )}

        <View style={{ gap: tokens.spacing[3] }}>
          <Text style={styles.sectionLabel}>SUCURSALES</Text>
          <View style={styles.list}>
            {locations.map((loc) => {
              const isActive = currentLocation?.id === loc.id;
              const isLoading = loading && !isActive;
              return (
                <Pressable
                  key={loc.id}
                  onPress={() =>
                    !isActive && !loading && handleSelectLocation(loc.id)
                  }
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.option,
                    isActive && styles.optionActive,
                    pressed &&
                      !isActive && {
                        backgroundColor: styles.optionIconBox.backgroundColor,
                      },
                  ]}
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      isActive && styles.optionIconBoxActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={isActive ? "map-marker" : "map-marker-outline"}
                      size={20}
                      color={
                        isActive
                          ? styles.optionBadgeText.color
                          : styles.optionSubtitle.color
                      }
                    />
                  </View>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {loc.name}
                    </Text>
                    {!!loc.address && (
                      <Text style={styles.optionSubtitle} numberOfLines={1}>
                        {loc.address}
                      </Text>
                    )}
                  </View>
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={styles.optionSubtitle.color}
                    />
                  ) : isActive ? (
                    <View style={styles.optionBadge}>
                      <MaterialCommunityIcons
                        name="check"
                        size={12}
                        color={styles.optionBadgeText.color}
                      />
                      <Text style={styles.optionBadgeText}>ACTUAL</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information"
            size={16}
            color={styles.infoText.color}
          />
          <Text style={styles.infoText}>
            Los datos de inventario y reportes mostrados corresponderan a la
            sucursal seleccionada.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
