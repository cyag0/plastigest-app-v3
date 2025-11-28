import AppBar from "@/components/App/AppBar";
import AppList from "@/components/App/AppList/AppList";
import PurchaseStats from "@/components/Dashboard/PurchaseStats";
import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";

// Helper function to get status configuration
const getStatusConfig = (status: string) => {
  switch (status) {
    case "draft":
      return {
        label: "BORRADOR",
        backgroundColor: palette.warning + "20",
        borderColor: palette.warning,
        textColor: palette.textSecondary,
      };
    case "ordered":
      return {
        label: "PEDIDO",
        backgroundColor: palette.info + "20",
        borderColor: palette.accent,
        textColor: palette.textSecondary,
      };
    case "in_transit":
      return {
        label: "EN TRANSPORTE",
        backgroundColor: palette.accent + "20",
        borderColor: palette.accent,
        textColor: palette.textSecondary,
      };
    case "received":
      return {
        label: "RECIBIDO",
        backgroundColor: palette.success + "20",
        borderColor: palette.success,
        textColor: palette.textSecondary,
      };
    default:
      return {
        label: "DESCONOCIDO",
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textColor: palette.textSecondary,
      };
  }
};

export default function PurchasesIndex() {
  const router = useRouter();
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "list", title: "Lista de Compras" },
    { key: "stats", title: "Estadísticas" },
  ]);

  useAsync(async () => {
    const response = await Services.purchases.index({ all: true });
    console.log("Purchases loaded:", response.data);
  });

  const renderListRoute = useMemo(
    () => () =>
      (
        <AppList
          title="Compras"
          service={Services.purchases}
          showAppBar={false}
          renderCard={({ item }: { item: any }) => {
            const statusConfig = getStatusConfig(item.status);

            return {
              title: `Compra #${item.document_number || item.id}`,
              description: `Proveedor: ${
                item.supplier_name || "Sin proveedor"
              }`,
              right: (
                <View style={styles.rightContent}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusConfig.backgroundColor,
                        borderColor: statusConfig.borderColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusConfig.textColor },
                      ]}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
              ),
              bottom: [
                {
                  label: "Fecha",
                  value: new Date(item.created_at).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }),
                },
                {
                  label: "Productos",
                  value: `${item.products_count || 0} items`,
                },
              ],
            };
          }}
          onItemPress={(entity: any) => {
            router.push(`/(tabs)/home/purchases/${entity.id}` as any);
          }}
          onPressCreate={() => {
            router.push("/(tabs)/home/purchases/form" as any);
          }}
          fabLabel="Nueva Compra"
        />
      ),
    [router]
  );

  const renderStatsRoute = useMemo(() => () => <PurchaseStats />, []);

  const renderScene = useMemo(
    () =>
      SceneMap({
        list: renderListRoute,
        stats: renderStatsRoute,
      }),
    [renderListRoute, renderStatsRoute]
  );

  return (
    <View style={styles.container}>
      <AppBar
        title={"Compras"}
        showBackButton={true}
        showNotificationButton={false}
        showProfileButton={false}
        showSearchButton={false}
      />

      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, index === 0 && styles.tabActive]}
          onPress={() => setIndex(0)}
        >
          <Text style={[styles.tabText, index === 0 && styles.tabTextActive]}>
            Lista de Compras
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
  rightContent: {
    alignItems: "flex-end",
    gap: 8,
  },
  cardTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardTitleText: {
    color: palette.text,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  cardDescription: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  supplierText: {
    color: palette.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  amountText: {
    color: palette.primary,
    fontWeight: "700",
    fontSize: 16,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
});
