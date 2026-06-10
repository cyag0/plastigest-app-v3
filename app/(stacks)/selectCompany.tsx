import EmptyState from "@/components/App/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { tokens } from "@/constants/tokens";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

interface Company {
  id: number;
  name: string;
  business_name: string;
  rfc: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

/**
 * Pantalla standalone para seleccionar empresa. Mismo diseno
 * SaaS 2025 que el `LocationSelector` y la seccion de empresa
 * del `ContextSwitcherModal`. Se usa como bootstrap inicial y
 * sigue siendo accesible desde el flujo de navegacion (la version
 * modal vive dentro de la app via el `ContextSwitcherModal`).
 */
export default function SelectCompanyScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const {
    companies,
    selectedCompany: currentCompany,
    selectCompany,
    isLoadingCompanies,
    loadCompanies,
    selectLocation,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    // Solo cargamos companies si el array esta vacio. Antes
    // `loadCompanies` estaba en el array de deps, pero como
    // AuthContext no la envuelve en useCallback, era una
    // referencia nueva en cada render y este effect se re-ejecutaba
    // eternamente, lo que hacia parpadear `isLoadingCompanies` y
    // deshabilitaba los Pressables intermitentemente.
    if (companies.length === 0) {
      loadCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  const loadAndSelectLocation = async (companyId: number) => {
    try {
      setLoadingLocations(true);
      const response = await Services.admin.locations.index({
        all: true,
        company_id: companyId,
      });
      const locationsData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      // Si la empresa tiene exactamente una sucursal, la auto-seleccionamos
      // y la app va directo al home. Si tiene 0 o 2+ dejamos `location` en
      // null para que el NavigationHandler renderice el LocationSelector.
      // NO reseteamos a null al final: eso borraba la auto-seleccion y la
      // app se quedaba atorada en el selector de sucursal.
      if (Array.isArray(locationsData) && locationsData.length === 1) {
        await selectLocation(locationsData[0]);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSelectCompany = async (companyId: number) => {
    const companyToSelect = companies.find((c) => c.id === companyId);
    if (!companyToSelect) {
      alerts.error("Compania no encontrada");
      return;
    }
    if (currentCompany?.id === companyId) {
      // Ya estamos en esta empresa: salimos de la pantalla sin
      // pedir confirmacion. Antes el onPress hacia short-circuit
      // con `!isCurrent && ...` y este `router.back()` nunca
      // llegaba a ejecutarse, dejando al usuario atascado.
      router.back();
      return;
    }

    // Solo pedimos confirmacion cuando estamos cambiando de empresa
    // (ya hay `currentCompany`). En el bootstrap inicial la accion es
    // implicita y un dialogo extra solo agrega friccion y un punto
    // de falla extra (Portal/dialog puede no montarse en algunos
    // navegadores web).
    if (currentCompany) {
      const confirmed = await alerts.confirm(
        `¿Cambiar a ${companyToSelect.name}?`,
        { title: "Confirmar Cambio", okText: "Cambiar", cancelText: "Cancelar" }
      );
      if (!confirmed) return;
    }

    try {
      setLoading(true);
      // Solo limpiamos la sucursal previa si estamos cambiando de empresa
      // (no en el bootstrap inicial). Esto evita el flash del LoaderWithLogo
      // que se dispara cuando `selectLocation` prende `isSwitchingLocation`.
      if (currentCompany) {
        await selectLocation(null);
      }
      await selectCompany(companyToSelect);
      await loadAndSelectLocation(companyId);
      alerts.success(
        currentCompany
          ? `Has cambiado a ${companyToSelect.name}`
          : `Empresa ${companyToSelect.name} seleccionada`
      );
      router.back();
    } catch {
      alerts.error("No se pudo cambiar de compania. Intenta nuevamente.");
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
      paddingBottom: tokens.spacing[8],
      maxWidth: 720,
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

  const isLoading = isLoadingCompanies || loadingLocations || loading;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons
              name="office-building"
              size={28}
              color={styles.optionBadgeText.color}
            />
          </View>
          <Text style={styles.title}>Selecciona tu empresa</Text>
          <Text style={styles.subtitle}>
            Cambia entre las empresas a las que tienes acceso
          </Text>
        </View>

        {currentCompany && (
          <View style={styles.currentCard}>
            <View style={styles.currentIconBox}>
              <MaterialCommunityIcons
                name="check-circle"
                size={18}
                color={styles.optionBadgeText.color}
              />
            </View>
            <View style={styles.currentBody}>
              <Text style={styles.currentLabel}>EMPRESA ACTUAL</Text>
              <Text style={styles.currentName} numberOfLines={1}>
                {currentCompany.name}
              </Text>
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={styles.title.color} />
            <Text style={styles.loadingText}>
              {loadingLocations
                ? "Configurando ubicacion..."
                : "Cargando empresas..."}
            </Text>
          </View>
        ) : companies.length === 0 ? (
          <EmptyState
            icon="office-building-outline"
            title="No hay empresas disponibles"
            description="Contacta al administrador para obtener acceso"
          />
        ) : (
          <View style={{ gap: tokens.spacing[3] }}>
            <Text style={styles.sectionLabel}>EMPRESAS</Text>
            <View style={styles.list}>
              {companies.map((company) => {
                const isCurrent = currentCompany?.id === company.id;
                return (
                  <Pressable
                    key={company.id}
                    // onPress siempre llama a handleSelectCompany (incluso
                    // cuando es la empresa actual). El cortocircuito
                    // `!isCurrent && ...` se elimino porque silenciaba
                    // el tap y dejaba al usuario sin forma de salir
                    // (router.back() nunca se ejecutaba).
                    onPress={() => {
                      if (isLoading) return;
                      handleSelectCompany(company.id);
                    }}
                    // Usamos el estado combinado (auth + local) para
                    // bloquear taps duplicados durante la auto-seleccion
                    // de sucursal, no solo el `loading` local.
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.option,
                      isCurrent && styles.optionActive,
                      pressed &&
                        !isCurrent && {
                          backgroundColor: styles.optionIconBox.backgroundColor,
                        },
                    ]}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        isCurrent && styles.optionIconBoxActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          isCurrent
                            ? "office-building"
                            : "office-building-outline"
                        }
                        size={20}
                        color={
                          isCurrent
                            ? styles.optionBadgeText.color
                            : styles.optionSubtitle.color
                        }
                      />
                    </View>
                    <View style={styles.optionBody}>
                      <Text style={styles.optionTitle} numberOfLines={1}>
                        {company.name}
                      </Text>
                      <Text style={styles.optionSubtitle} numberOfLines={1}>
                        {company.business_name}
                      </Text>
                    </View>
                    {isCurrent ? (
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
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information"
            size={16}
            color={styles.infoText.color}
          />
          <Text style={styles.infoText}>
            Al cambiar de empresa, la sucursal se reiniciara. Si la empresa
            tiene solo una sucursal, se seleccionara automaticamente.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
