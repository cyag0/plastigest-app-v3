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
}

const modules: TransferModule[] = [
  {
    id: "receipts",
    title: "Solicitudes Recibidas",
    description: "Peticiones que otras sucursales hicieron a esta sucursal",
    icon: "clipboard-check",
    route: "/(tabs)/home/receipts",
    color: palette.success,
  },
  {
    id: "petitions",
    title: "Mis Solicitudes",
    description: "Peticiones enviadas por mí a otras sucursales",
    icon: "file-document-edit",
    route: "/(tabs)/home/petitions",
    color: palette.warning,
  },
  {
    id: "shipments",
    title: "Envíos Realizados",
    description:
      "Envíos completados que esta sucursal envió a otras sucursales",
    icon: "package-variant",
    route: "/(tabs)/home/shipments",
    color: palette.blue,
  },
  {
    id: "transfers",
    title: "Envíos Recibidos",
    description:
      "Envíos completados que esta sucursal recibió de otras sucursales",
    icon: "truck-delivery",
    route: "/(tabs)/home/transfers",
    color: palette.error,
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

  const renderModulesRoute = useMemo(
    () => () =>
      (
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
              Selecciona el módulo que deseas gestionar
            </Text>
          </View>

          {/* Modules Grid */}
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Módulos Disponibles
          </Text>
          <View style={styles.modulesGrid}>
            {modules.map((module) => (
              <Card
                key={module.id}
                style={styles.moduleCard}
                onPress={() => handleModulePress(module.route)}
              >
                <Card.Content style={styles.moduleContent}>
                  {/* Icon */}
                  <View style={styles.moduleIconContainer}>
                    <MaterialCommunityIcons
                      name={module.icon as any}
                      size={40}
                      color={module.color}
                    />
                  </View>

                  {/* Module Name */}
                  <Text
                    variant="titleMedium"
                    style={[styles.moduleName, { color: module.color }]}
                    numberOfLines={2}
                  >
                    {module.title}
                  </Text>

                  {/* Description */}
                  <Text
                    variant="bodySmall"
                    style={styles.moduleDescription}
                    numberOfLines={2}
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
                Las transferencias te permiten mover productos entre diferentes
                ubicaciones de tu empresa. Puedes crear solicitudes, enviar
                productos y confirmar recepciones.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      ),
    []
  );

  const renderStatsRoute = useMemo(() => () => <TransferStats />, []);

  const renderScene = useMemo(
    () =>
      SceneMap({
        modules: renderModulesRoute,
        stats: renderStatsRoute,
      }),
    [renderModulesRoute, renderStatsRoute]
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
  modulesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  moduleCard: {
    flex: 1,
    minWidth: "47%",
    maxWidth: "48%",
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  moduleContent: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 8,
  },
  moduleIconContainer: {
    marginBottom: 8,
  },
  moduleName: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  moduleDescription: {
    color: palette.textSecondary,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: palette.blue + "10",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.blue,
    marginTop: 8,
    shadowColor: "transparent",
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
});
