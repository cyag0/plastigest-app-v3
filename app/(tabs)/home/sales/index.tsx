import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
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

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "efectivo":
        return "Efectivo";
      case "tarjeta":
        return "Tarjeta";
      case "transferencia":
        return "Transferencia";
      default:
        return method || "-";
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "efectivo":
        return "#2E7D32";
      case "tarjeta":
        return "#1565C0";
      case "transferencia":
        return "#6D4C41";
      default:
        return "#607D8B";
    }
  };

  const getPaymentStatusLabel = (status?: string) => {
    switch (status) {
      case "paid":
        return "Pagado";
      case "partial":
        return "Parcial";
      case "pending":
        return "Pendiente";
      default:
        return status || "-";
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "paid":
        return "#2E7D32";
      case "partial":
        return "#B45309";
      case "pending":
        return "#B3261E";
      default:
        return "#607D8B";
    }
  };

  const columns = useMemo<AppListColumn<any>[]>(
    () => [
      {
        title: "Venta",
        key: "sale_number",
        width: 130,
        render: (_, sale) => sale.sale_number || `#${sale.id}`,
      },
      {
        title: "Fecha",
        key: "sale_date",
        width: 130,
        render: (_, sale) =>
          new Date(sale.sale_date).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
      },
      {
        title: "Estado",
        key: "status",
        width: 150,
        render: (_, sale) => (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: getStatusColor(sale.status),
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text variant="labelSmall" style={{ color: "#fff", fontWeight: "700" }}>
              {getStatusLabel(sale.status)}
            </Text>
          </View>
        ),
      },
      {
        title: "Pago",
        key: "payment_method",
        width: 150,
        render: (_, sale) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              backgroundColor: getPaymentMethodColor(sale.payment_method),
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <MaterialCommunityIcons
              name={getPaymentMethodIcon(sale.payment_method)}
              size={13}
              color="#fff"
            />
            <Text variant="labelSmall" style={{ color: "#fff", fontWeight: "700" }}>
              {getPaymentMethodLabel(sale.payment_method)}
            </Text>
          </View>
        ),
      },
      {
        title: "Estado pago",
        key: "payment_status",
        width: 150,
        render: (_, sale) => (
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: getPaymentStatusColor(sale.payment_status),
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Text variant="labelSmall" style={{ color: "#fff", fontWeight: "700" }}>
              {getPaymentStatusLabel(sale.payment_status)}
            </Text>
          </View>
        ),
      },
      {
        title: "Total",
        key: "total_cost",
        width: 120,
        align: "right",
        render: (_, sale) =>
          new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(sale.total_cost || 0),
      },
    ],
    [],
  );

  const renderListRoute = useMemo(
    () => () => (
      <AppList
        title="Ventas"
        service={Services.sales}
        showAppBar={false}
        onItemPress={(entity) => {
          navigation.push(`/(tabs)/home/sales/${entity.id}` as any);
        }}
        onPressCreate={() => {
          navigation.push("/(tabs)/home/sales/formv2" as any);
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

              {/* Estado de pago */}
              {sale.payment_status && (
                <View style={{ marginTop: 4 }}>
                  <Text
                    variant="bodySmall"
                    style={{
                      color:
                        sale.payment_status === "paid"
                          ? palette.success
                          : sale.payment_status === "partial"
                            ? palette.warning
                            : palette.error,
                      fontWeight: "600",
                    }}
                  >
                    {sale.payment_status === "paid"
                      ? "✓ Pagado"
                      : sale.payment_status === "partial"
                        ? `Parcial: ${new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          }).format(sale.paid_amount || 0)}`
                        : "Pendiente de pago"}
                  </Text>
                </View>
              )}
            </View>
          ),
          right: (
            <AppList.Description
              style={{
                color: getStatusColor(sale.status),
                fontWeight: "bold",
              }}
            >
              {getStatusLabel(sale.status)}
            </AppList.Description>
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
        columns={columns}
      />
    ),
    [navigation, columns],
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
    [renderListRoute, renderStatsRoute, renderCashRegisterRoute],
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
