import TransferStats from "@/components/Dashboard/TransferStats";
import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Card, IconButton, Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";

interface TransferModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  badge?: string;
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
  },
  {
    id: "history",
    title: "Historial",
    description: "Consulta envíos realizados y recibidos completados",
    icon: "history",
    route: "/(tabs)/home/transfers/history",
    color: palette.blue,
  },
];

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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <IconButton
              icon="swap-horizontal"
              size={32}
              iconColor={palette.primary}
              style={{ margin: 0 }}
            />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Sistema de Transferencias
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Gestiona el movimiento de productos entre ubicaciones
          </Text>
        </View>

        {/* Quick Action */}
        <Card
          style={[
            styles.quickActionCard,
            styles.noShadowCard,
            { backgroundColor: palette.success },
          ]}
          onPress={handleCreateTransfer}
        >
          <Card.Content style={styles.quickActionContent}>
            <View style={styles.quickActionIcon}>
              <MaterialCommunityIcons
                name="plus-circle"
                size={32}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.quickActionText}>
              <Text variant="titleMedium" style={styles.quickActionTitle}>
                Nueva Transferencia
              </Text>
              <Text variant="bodySmall" style={styles.quickActionSubtitle}>
                Solicita productos de otra ubicación
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#FFFFFF"
            />
          </Card.Content>
        </Card>

        {/* Modules Grid */}
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Consultas
        </Text>
        <View style={styles.modulesGrid}>
          {modules.map((module) => (
            <Card
              key={module.id}
              style={[
                styles.moduleCard,
                styles.noShadowCard,
                { backgroundColor: module.color },
              ]}
              onPress={() => handleModulePress(module.route)}
            >
              <Card.Content style={styles.moduleContent}>
                {/* Icon */}
                <View style={styles.moduleIconContainer}>
                  <MaterialCommunityIcons
                    name={module.icon as any}
                    size={48}
                    color="#FFFFFF"
                  />
                  {module.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{module.badge}</Text>
                    </View>
                  )}
                </View>

                {/* Module Name */}
                <Text
                  variant="titleMedium"
                  style={styles.moduleName}
                  numberOfLines={2}
                >
                  {module.title}
                </Text>

                {/* Description */}
                <Text
                  variant="bodySmall"
                  style={styles.moduleDescription}
                  numberOfLines={3}
                >
                  {module.description}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={palette.blue}
            />
            <Text variant="bodySmall" style={styles.infoText}>
              Crea solicitudes para pedir productos entre ubicaciones. El
              sistema valida automáticamente el stock disponible y gestiona el
              flujo completo hasta la recepción.
            </Text>
          </Card.Content>
        </Card>
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
    <View style={styles.container}>
      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, index === 0 && styles.tabActive]}
          onPress={() => setIndex(0)}
        >
          <Text style={[styles.tabText, index === 0 && styles.tabTextActive]}>
            Módulos
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, index === 1 && styles.tabActive]}
          onPress={() => setIndex(1)}
        >
          <Text style={[styles.tabText, index === 1 && styles.tabTextActive]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderBottomWidth: 2,
    borderBottomColor: palette.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: palette.error,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  tabTextActive: {
    color: palette.error,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 800,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerIcon: {
    backgroundColor: palette.primary + "15",
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
  sectionTitle: {
    color: palette.text,
    fontWeight: "600",
    marginBottom: 16,
    marginTop: 8,
  },
  quickActionCard: {
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 0,
  },
  quickActionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 2,
  },
  quickActionSubtitle: {
    color: "#FFFFFF",
    fontSize: 12,
    opacity: 0.9,
  },
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  moduleCard: {
    flex: 1,
    minWidth: "100%",
    borderRadius: 12,
    borderWidth: 0,
  },
  moduleContent: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 8,
  },
  moduleIconContainer: {
    marginBottom: 8,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: palette.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  moduleName: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  moduleDescription: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.92,
  },
  infoCard: {
    backgroundColor: palette.blue + "10",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.blue,
    marginTop: 8,
  },
  infoContent: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    color: palette.text,
    lineHeight: 20,
  },
  noShadowCard: {
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
});
