import AppList from "@/components/App/AppList/AppList";
import CashRegister from "@/components/Dashboard/CashRegister";
import SaleStats from "@/components/Dashboard/SaleStats";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";

export default function SalesIndex() {
  const navigation = router;
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: "list", title: "Ventas" },
    { key: "stats", title: "Estadísticas" },
    { key: "cashRegister", title: "Corte de Caja" },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return palette.warning;
      case "processed":
        return palette.info;
      case "closed":
        return palette.primary;
      case "cancelled":
        return palette.red;
      default:
        return "#6c757d";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return "file-document-edit-outline";
      case "processed":
        return "progress-clock";
      case "closed":
        return "check-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Borrador";
      case "processed":
        return "Procesada";
      case "closed":
        return "Cerrada";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "efectivo":
        return "cash";
      case "tarjeta":
        return "credit-card";
      case "transferencia":
        return "bank-transfer";
      default:
        return "cash";
    }
  };

  const renderListRoute = useMemo(
    () => () =>
      (
        <AppList
          title="Ventas"
          service={Services.sales}
          showAppBar={false}
          filters={[
            {
              type: "simple",
              name: "status",
              label: "Estado",
              options: [
                { label: "Todos", value: "" },
                { label: "Borrador", value: "draft" },
                { label: "Procesada", value: "processed" },
                { label: "Cerrada", value: "closed" },
                { label: "Cancelada", value: "cancelled" },
              ],
            },
            {
              type: "simple",
              name: "payment_method",
              label: "Método de Pago",
              options: [
                { label: "Todos", value: "" },
                { label: "Efectivo", value: "efectivo" },
                { label: "Tarjeta", value: "tarjeta" },
                { label: "Transferencia", value: "transferencia" },
              ],
            },
          ]}
          onItemPress={(entity) => {
            navigation.push(`/(tabs)/home/sales/${entity.id}` as any);
          }}
          onPressCreate={() => {
            navigation.push("/(tabs)/home/sales/formv2/productos" as any);
          }}
          renderCard={({ item: sale }) => ({
            title: (
              <>
                <AppList.Title>
                  {sale.sale_number || `Venta #${sale.id}`}
                </AppList.Title>
              </>
            ),
            bottom: [
              {
                label: "Fecha",
                value: new Date(sale.sale_date).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }),
              },
              {
                label: "Método de pago",
                value:
                  sale.payment_method === "efectivo"
                    ? "Efectivo"
                    : sale.payment_method === "tarjeta"
                    ? "Tarjeta"
                    : "Transferencia",
              },
            ],
            description: (
              <View style={{ gap: 8, marginTop: 8 }}>
                {/* Productos y Total */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={14}
                      color={palette.textSecondary}
                    />
                    <Text
                      variant="bodySmall"
                      style={{ color: palette.textSecondary }}
                    >
                      {sale.details?.length || 0}{" "}
                      {sale.details?.length === 1 ? "producto" : "productos"}
                    </Text>
                  </View>

                  <Text
                    variant="titleSmall"
                    style={{ fontWeight: "bold", color: palette.primary }}
                  >
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(sale.total_cost)}
                  </Text>
                </View>
              </View>
            ),
            right: (
              <View style={styles.rightContent}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getStatusColor(sale.status) + "20",
                      borderColor: getStatusColor(sale.status),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: palette.textSecondary },
                    ]}
                  >
                    {getStatusLabel(sale.status).toUpperCase()}
                  </Text>
                </View>
              </View>
            ),
          })}
          menu={{
            showDelete(item) {
              return item.status !== "closed";
            },
            showEdit(item) {
              return item.status !== "closed";
            },
          }}
          searchPlaceholder="Buscar ventas..."
        />
      ),
    [navigation]
  );

  const renderStatsRoute = useMemo(() => () => <SaleStats />, []);

  const renderCashRegisterRoute = useMemo(() => () => <CashRegister />, []);

  const renderScene = useMemo(
    () =>
      SceneMap({
        list: renderListRoute,
        stats: renderStatsRoute,
        cashRegister: renderCashRegisterRoute,
      }),
    [renderListRoute, renderStatsRoute, renderCashRegisterRoute]
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
            Ventas
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
        <Pressable
          style={[styles.tab, index === 2 && styles.tabActive]}
          onPress={() => setIndex(2)}
        >
          <Text style={[styles.tabText, index === 2 && styles.tabTextActive]}>
            Corte de Caja
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
    alignItems: "flex-end" as const,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold" as const,
  },
});
