import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { tokens } from "@/constants/tokens";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Modal, Portal } from "react-native-paper";

export interface ContextSwitcherModalProps {
  visible: boolean;
  onDismiss: () => void;
  /**
   * Vista inicial del modal. `location` salta directo al selector de
   * sucursal (util cuando se abre desde el sidebar). `company` muestra
   * el listado de empresas.
   */
  initialView?: "location" | "company";
}

/**
 * Modal que permite cambiar de compania o sucursal SIN navegar a una
 * ruta nueva. Reemplaza los `router.push("/(stacks)/selectLocation")` y
 * `router.push("/(stacks)/selectCompany")` para que el usuario pueda
 * conmutar contexto sin perder el tab en el que estaba trabajando.
 *
 * Inspirado en los selectores de Linear / Notion / Vercel: lista de
 * opciones con la activa marcada, un solo click para cambiar y el
 * modal se cierra solo.
 */
export default function ContextSwitcherModal({
  visible,
  onDismiss,
  initialView = "location",
}: ContextSwitcherModalProps) {
  const auth = useAuth();
  const alerts = useAlerts();
  const {
    companies,
    selectedCompany,
    location: currentLocation,
    selectCompany,
    selectLocation,
    loadCompanies,
  } = auth;
  const [loadingCompanyId, setLoadingCompanyId] = useState<number | null>(null);
  const [loadingLocationId, setLoadingLocationId] = useState<number | null>(null);
  // Mientras un confirm de alerts esta abierto ocultamos este modal. Los
  // portales de Paper se apilan por orden de montaje (no por zIndex: el
  // PortalManager envuelve cada portal en un <View absoluteFill> sin zIndex,
  // y zIndex en RN solo afecta hermanos directos), asi que el confirm —
  // montado antes, en la raiz — quedaria DETRAS del switcher. Ocultarlo
  // garantiza que el confirm se vea al frente sin pelear con el z-index.
  const [confirming, setConfirming] = useState(false);

  // Cargar companias al abrir si aun no estan
  useEffect(() => {
    if (visible && companies.length === 0) {
      loadCompanies();
    }
  }, [visible, companies.length, loadCompanies]);

  const handleSelectCompany = async (companyId: number) => {
    const companyToSelect = companies.find((c) => c.id === companyId);
    if (!companyToSelect) return;
    if (selectedCompany?.id === companyId) {
      onDismiss();
      return;
    }
    setConfirming(true);
    const confirmed = await alerts.confirm(
      `¿Cambiar a ${companyToSelect.name}?`,
      { title: "Confirmar Cambio", okText: "Cambiar", cancelText: "Cancelar" }
    );
    if (!confirmed) {
      setConfirming(false);
      return;
    }
    try {
      setLoadingCompanyId(companyId);
      // Limpiar ubicacion antes de cambiar de compania para forzar
      // una seleccion coherente con la nueva empresa.
      await selectLocation(null);
      await selectCompany(companyToSelect);
      alerts.success(`Has cambiado a ${companyToSelect.name}`);
      onDismiss();
    } catch {
      alerts.error("No se pudo cambiar de compania. Intenta nuevamente.");
    } finally {
      setLoadingCompanyId(null);
      setConfirming(false);
    }
  };

  const handleSelectLocation = async (loc: App.Entities.Location) => {
    if (currentLocation?.id === loc.id) {
      onDismiss();
      return;
    }
    setConfirming(true);
    const confirmed = await alerts.confirm(
      `¿Cambiar a ${loc.name}?`,
      { title: "Confirmar Cambio", okText: "Cambiar", cancelText: "Cancelar" }
    );
    if (!confirmed) {
      setConfirming(false);
      return;
    }
    try {
      setLoadingLocationId(loc.id);
      await selectLocation(loc);
      alerts.success(`Has cambiado a ${loc.name}`);
      onDismiss();
    } catch {
      alerts.error("No se pudo cambiar de ubicacion. Intenta nuevamente.");
    } finally {
      setLoadingLocationId(null);
      setConfirming(false);
    }
  };

  const styles = useThemedStyles((colors) => ({
    backdrop: {
      backgroundColor: colors.overlay,
    },
    container: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.xl,
      overflow: "hidden",
      ...tokens.shadow.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: tokens.spacing[5],
      paddingVertical: tokens.spacing[4],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...tokens.typography.h2,
      color: colors.text,
    },
    headerSubtitle: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: tokens.radius.md,
    },
    body: {
      maxHeight: 480,
    },
    section: {
      paddingHorizontal: tokens.spacing[5],
      paddingTop: tokens.spacing[5],
      paddingBottom: tokens.spacing[3],
      gap: tokens.spacing[3],
    },
    sectionLabel: {
      ...tokens.typography.micro,
      color: colors.textMuted,
      letterSpacing: 0.6,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      padding: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionIconBox: {
      width: 40,
      height: 40,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      backgroundColor: colors.surfaceMuted,
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
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.spacing[2],
      padding: tokens.spacing[3],
      marginHorizontal: tokens.spacing[5],
      marginBottom: tokens.spacing[5],
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
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: tokens.spacing[5],
      gap: tokens.spacing[2],
    },
    loadingText: {
      ...tokens.typography.body,
      color: colors.textSecondary,
    },
    emptyBox: {
      alignItems: "center",
      paddingVertical: tokens.spacing[7],
      gap: tokens.spacing[2],
    },
    emptyTitle: {
      ...tokens.typography.bodyMd,
      color: colors.text,
      fontWeight: "600",
    },
    emptySubtitle: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
  }));

  return (
    <Portal>
      {/*
        Ocultamos el modal mientras un confirm de alerts esta abierto
        (`!confirming`). El PortalManager de Paper apila los portales por
        orden de montaje, no por zIndex, asi que no se puede empujar este
        modal por detras del confirm con estilos; ocultarlo deja el confirm
        visible al frente y lo restaura si el usuario cancela.
      */}
        <Modal
          visible={visible && !confirming}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.container,
            {
              width: Platform.OS === "web" ? 480 : "92%",
              alignSelf: "center",
              maxHeight: "85%",
            },
          ]}
          style={styles.backdrop}
        >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Cambiar de contexto</Text>
            <Text style={styles.headerSubtitle}>
              Cambia la empresa o sucursal sin salir de la pantalla actual
            </Text>
          </View>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { backgroundColor: styles.optionIconBox.backgroundColor },
            ]}
            hitSlop={8}
            accessibilityLabel="Cerrar"
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={styles.optionSubtitle.color}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: tokens.spacing[2] }}
          showsVerticalScrollIndicator={false}
        >
          {selectedCompany ? (
            <CompanySection
              companies={companies}
              selectedId={selectedCompany.id}
              onSelect={handleSelectCompany}
              loadingId={loadingCompanyId}
              styles={styles}
              dimmed={initialView === "location"}
            />
          ) : (
            <CompanySection
              companies={companies}
              selectedId={null}
              onSelect={handleSelectCompany}
              loadingId={loadingCompanyId}
              styles={styles}
              dimmed={false}
            />
          )}

          {selectedCompany && (
            <LocationSection
              companyId={selectedCompany.id}
              currentLocationId={currentLocation?.id}
              onSelect={handleSelectLocation}
              loadingId={loadingLocationId}
              styles={styles}
              dimmed={initialView === "company"}
            />
          )}

          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="information"
              size={16}
              color={styles.infoText.color}
            />
            <Text style={styles.infoText}>
              {selectedCompany
                ? "Los datos de inventario y reportes mostrados corresponderan a la sucursal seleccionada."
                : "Selecciona una empresa para ver sus sucursales disponibles."}
            </Text>
          </View>
        </ScrollView>
        </Modal>
    </Portal>
  );
}

// ─── Sub-secciones ────────────────────────────────────────────────────────────

interface SectionStyles {
  [key: string]: any;
}

interface CompanySectionProps {
  companies: { id: number; name: string; business_name: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loadingId: number | null;
  styles: SectionStyles;
  dimmed: boolean;
}

function CompanySection({
  companies,
  selectedId,
  onSelect,
  loadingId,
  styles,
  dimmed,
}: CompanySectionProps) {
  return (
    <View style={[styles.section, dimmed && { opacity: 0.5 }]}>
      <Text style={styles.sectionLabel}>EMPRESA</Text>
      {companies.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons
            name="office-building-outline"
            size={36}
            color={styles.emptySubtitle.color}
          />
          <Text style={styles.emptyTitle}>Sin empresas disponibles</Text>
          <Text style={styles.emptySubtitle}>
            Contacta al administrador para obtener acceso
          </Text>
        </View>
      ) : (
        companies.map((company) => {
          const isActive = selectedId === company.id;
          const loading = loadingId === company.id;
          return (
            <Pressable
              key={company.id}
              onPress={() => onSelect(company.id)}
              disabled={loading}
              style={({ pressed }) => [
                styles.option,
                isActive && styles.optionActive,
                pressed && !isActive && { backgroundColor: styles.optionIconBox.backgroundColor },
              ]}
            >
              <View
                style={[
                  styles.optionIconBox,
                  isActive && styles.optionIconBoxActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={isActive ? "office-building" : "office-building-outline"}
                  size={20}
                  color={isActive ? styles.optionBadgeText.color : styles.optionSubtitle.color}
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
              {loading ? (
                <ActivityIndicator size="small" color={styles.optionSubtitle.color} />
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
        })
      )}
    </View>
  );
}

interface LocationSectionProps {
  companyId: number;
  currentLocationId: number | null | undefined;
  onSelect: (loc: App.Entities.Location) => void;
  loadingId: number | null;
  styles: SectionStyles;
  dimmed: boolean;
}

function LocationSection({
  companyId,
  currentLocationId,
  onSelect,
  loadingId,
  styles,
  dimmed,
}: LocationSectionProps) {
  const [locations, setLocations] = useState<App.Entities.Location[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await Services.admin.locations.index({
          company_id: companyId,
          is_active: true,
        });
        if (cancelled) return;
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];
        setLocations(data);
      } catch (error) {
        if (!cancelled) console.error("Error loading locations:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <View style={[styles.section, dimmed && { opacity: 0.5 }]}>
      <Text style={styles.sectionLabel}>SUCURSAL</Text>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={styles.optionSubtitle.color} />
          <Text style={styles.loadingText}>Cargando sucursales...</Text>
        </View>
      ) : locations.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons
            name="map-marker-off-outline"
            size={36}
            color={styles.emptySubtitle.color}
          />
          <Text style={styles.emptyTitle}>Sin sucursales</Text>
          <Text style={styles.emptySubtitle}>
            Esta empresa aun no tiene sucursales registradas
          </Text>
        </View>
      ) : (
        locations.map((loc) => {
          const isActive = currentLocationId === loc.id;
          const isLoading = loadingId === loc.id;
          return (
            <Pressable
              key={loc.id}
              onPress={() => onSelect(loc)}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.option,
                isActive && styles.optionActive,
                pressed && !isActive && { backgroundColor: styles.optionIconBox.backgroundColor },
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
                  color={isActive ? styles.optionBadgeText.color : styles.optionSubtitle.color}
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
                <ActivityIndicator size="small" color={styles.optionSubtitle.color} />
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
        })
      )}
    </View>
  );
}
