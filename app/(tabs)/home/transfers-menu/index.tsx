import AppChip from "@/components/App/Chip";
import PermissionGate from "@/components/App/PermissionGate";
import TransferStats from "@/components/Dashboard/TransferStats";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SceneMap, TabView } from "react-native-tab-view";

interface TransferModule {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  color: string;
  badge?: string;
  badgeVariant?: "primary" | "success" | "warning" | "error" | "info" | "default";
}

const modules: TransferModule[] = [
  {
    id: "pending",
    title: "Solicitudes Pendientes",
    description:
      "Gestiona peticiones enviadas y recibidas que requieren acción",
    icon: "clipboard-text-clock",
    route: "/(tabs)/home/transfers/pending",
    color: palette.warning,
    badge: "Nuevo",
    badgeVariant: "primary",
  },
  {
    id: "history",
    title: "Historial",
    description: "Consulta envíos realizados y recibidos completados",
    icon: "history",
    route: "/(tabs)/home/transfers/history",
    color: palette.info,
  },
];

/**
 * Convierte un color hex (#RRGGBB) a rgba con alpha. Se usa
 * para crear fondos tonales del icon-box de cada opción.
 */
function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function TransfersMenuScreen() {
  const router = useRouter();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "modules", title: "Módulos" },
    { key: "stats", title: "Estadísticas" },
  ]);

  const handleModulePress = (route: string) => {
    router.push(route as any);
  };

  const handleCreateTransfer = () => {
    router.push("/(tabs)/home/transfers/formv2" as any);
  };

  const renderModulesRoute = useMemo(
    () => () => (
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ============== CONTEXT CARD ============== */}
        <View style={styles.contextCard}>
          <View style={styles.contextIconBox}>
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={20}
              color={palette.primary}
            />
          </View>
          <View style={styles.contextBody}>
            <Text style={styles.contextTitle}>Sistema de Transferencias</Text>
            <Text style={styles.contextSubtitle}>
              Gestiona el movimiento de productos entre ubicaciones. Solo
              verás las opciones para las que tienes permisos.
            </Text>
          </View>
        </View>

        {/* ============== PRIMARY ACTION ============== */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCreateTransfer}
          style={styles.primaryAction}
        >
          <View style={styles.primaryActionIconBox}>
            <MaterialCommunityIcons
              name="plus-circle"
              size={22}
              color={palette.primary}
            />
          </View>
          <View style={styles.primaryActionBody}>
            <Text style={styles.primaryActionTitle}>Nueva Transferencia</Text>
            <Text style={styles.primaryActionSubtitle}>
              Solicita productos de otra ubicación
            </Text>
          </View>
          <MaterialCommunityIcons
            name="arrow-right"
            size={18}
            color={palette.textMuted}
          />
        </TouchableOpacity>

        {/* ============== SECTION HEADER ============== */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={16}
            color={palette.textMuted}
          />
          <Text style={styles.sectionTitle}>CONSULTAS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{modules.length}</Text>
          </View>
        </View>

        {/* ============== OPTIONS LIST ============== */}
        <View style={styles.optionsCard}>
          {modules.map((module, i) => (
            <React.Fragment key={module.id}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleModulePress(module.route)}
                style={styles.optionItem}
              >
                <View
                  style={[
                    styles.optionIconBox,
                    { backgroundColor: hexWithAlpha(module.color, 0.12) },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={module.icon}
                    size={20}
                    color={module.color}
                  />
                </View>

                <View style={styles.optionBody}>
                  <View style={styles.optionHeaderRow}>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {module.title}
                    </Text>
                    {module.badge !== undefined && (
                      <AppChip
                        variant={module.badgeVariant ?? "primary"}
                        size="sm"
                      >
                        {module.badge}
                      </AppChip>
                    )}
                  </View>
                  <Text style={styles.optionDescription} numberOfLines={2}>
                    {module.description}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={18}
                  color={palette.textMuted}
                  style={styles.chevron}
                />
              </TouchableOpacity>

              {i < modules.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ============== INFO CARD ============== */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconBox}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={palette.info}
            />
          </View>
          <Text style={styles.infoText}>
            Crea solicitudes para pedir productos entre ubicaciones. El sistema
            valida automáticamente el stock disponible y gestiona el flujo
            completo hasta la recepción.
          </Text>
        </View>
      </ScrollView>
    ),
    [handleCreateTransfer],
  );

  const renderStatsRoute = useMemo(() => () => <TransferStats />, []);

  const renderScene = useMemo(
    () =>
      SceneMap({
        modules: renderModulesRoute,
        stats: renderStatsRoute,
      }),
    [renderModulesRoute, renderStatsRoute],
  );

  return (
    <PermissionGate permission="transfers_list">
      <View style={styles.container}>
        {/* Tabs Header */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, index === 0 && styles.tabActive]}
            onPress={() => setIndex(0)}
          >
            <Text
              style={[styles.tabText, index === 0 && styles.tabTextActive]}
            >
              Módulos
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, index === 1 && styles.tabActive]}
            onPress={() => setIndex(1)}
          >
            <Text
              style={[styles.tabText, index === 1 && styles.tabTextActive]}
            >
              Estadísticas
            </Text>
          </Pressable>
        </View>

        {/* Tab View */}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={() => null}
        />
      </View>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },

  // --- Tabs ---
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  tab: {
    flex: 1,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[4],
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: palette.primary,
  },
  tabText: {
    ...tokens.typography.bodyMd,
    color: palette.textSecondary,
  },
  tabTextActive: {
    color: palette.primary,
  },

  // --- Scroll container ---
  scrollContainer: {
    padding: tokens.spacing[5],
    paddingBottom: tokens.spacing[8],
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },

  // --- Context card (header) ---
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[5],
    ...tokens.shadow.sm,
  },
  contextIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contextBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  contextTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  contextSubtitle: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },

  // --- Primary action ---
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    backgroundColor: palette.primarySoft,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing[3] + 2,
    paddingHorizontal: tokens.spacing[4],
    marginBottom: tokens.spacing[5],
  },
  primaryActionIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  primaryActionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  primaryActionTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  primaryActionSubtitle: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },

  // --- Section header ---
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: tokens.spacing[3],
    paddingBottom: tokens.spacing[2],
    gap: tokens.spacing[2],
  },
  sectionTitle: {
    ...tokens.typography.micro,
    color: palette.textMuted,
    flex: 1,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 6,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
    fontVariant: ["tabular-nums"],
  },

  // --- Options card / list ---
  optionsCard: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    ...tokens.shadow.sm,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing[3] + 2,
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  optionTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    flex: 1,
    minWidth: 0,
  },
  optionDescription: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },
  chevron: {
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: tokens.spacing[4] + 40 + tokens.spacing[3],
  },

  // --- Info card (footer) ---
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: palette.surface,
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: palette.info,
    gap: tokens.spacing[3],
    marginTop: tokens.spacing[5],
    ...tokens.shadow.sm,
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
