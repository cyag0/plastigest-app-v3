import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import IconLabel from "@/components/App/IconLabel";
import PermissionGate from "@/components/App/PermissionGate";
import StatusBadge from "@/components/App/StatusBadge";
import SaleStats from "@/components/Dashboard/SaleStats";
import palette from "@/constants/palette";
import { type StatusInfo, paymentMethod, paymentStatus, saleStatus } from "@/constants/statuses";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";

/**
 * Un solo estado por venta. Casi todas están cerradas, así que "Cerrada" en
 * cada renglón no dice nada (y junto a "Pagado" eran dos badges verdes): se
 * muestra "Cancelada" si se canceló y, si no, cómo va el pago.
 */
function saleRowStatus(sale: any): StatusInfo {
  if (sale.status === "cancelled") return saleStatus(sale.status);
  return paymentStatus(sale.payment_status);
}

/** Lo mismo en la tarjeta, que no tiene encabezado: el parcial lleva lo abonado. */
function cardStatus(sale: any): StatusInfo {
  if (sale.status === "cancelled") return saleStatus(sale.status);
  const info = paymentStatus(sale.payment_status);
  if (sale.payment_status === "partial") {
    const paid = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(sale.paid_amount || 0);
    return { ...info, label: `Parcial · ${paid}` };
  }
  if (sale.payment_status === "pending") return { ...info, label: "Pendiente de pago" };
  return info;
}

export default function SalesIndex() {
  const navigation = router;
  const layout = useWindowDimensions();
  const alerts = useAlerts();
  const [index, setIndex] = useState(0);
  const { can } = useCan();
  // Las estadísticas y el PDF piden sales_read (la lista, sales_list).
  const canReadSales = can("sales_read");
  const routes = useMemo(
    () =>
      canReadSales
        ? [
            { key: "list", title: "Ventas" },
            { key: "stats", title: "Estadísticas" },
          ]
        : [{ key: "list", title: "Ventas" }],
    [canReadSales],
  );

  const { downloadPdfFromApi, isDownloading } = usePdfDownload({
    onError: (error) => alerts.error(error.message || "Error al descargar el PDF"),
  });

  const handleDownloadPdf = async (item: any) => {
    try {
      const response = await Services.sales.pdfUrl(Number(item.id));
      if (response?.url) {
        await downloadPdfFromApi(response.url, {
          fileName: `venta_${item.sale_number || item.id}.pdf`,
        });
      } else {
        alerts.error("No se pudo obtener la URL del PDF");
      }
    } catch (error: any) {
      alerts.error(error?.message || "Error al obtener la URL del PDF");
    }
  };

  const columns = useMemo<AppListColumn<any>[]>(
    () => [
      {
        title: "Venta",
        key: "sale_number",
        width: 180,
        render: (_, sale) => sale.sale_number || `#${sale.id}`,
      },
      {
        title: "Fecha",
        key: "sale_date",
        width: 130,
        render: (_, sale) =>
          formatDate(sale.sale_date),
      },
      {
        title: "Estado",
        key: "status",
        width: 150,
        render: (_, sale) => <StatusBadge {...saleRowStatus(sale)} />,
      },
      {
        title: "Pago",
        key: "payment_method",
        width: 150,
        render: (_, sale) => <IconLabel {...paymentMethod(sale.payment_method)} />,
      },
      {
        title: "Total",
        key: "total",
        width: 120,
        align: "right",
        render: (_, sale) =>
          new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
          }).format(sale.total || 0),
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
        permissionPrefix="sales"
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
              value: formatDate(sale.sale_date),
            },
            {
              label: "Método de pago",
              value: paymentMethod(sale.payment_method).label,
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
                  }).format(sale.total)}
                </Text>
              </View>

              {(sale.status === "cancelled" || sale.payment_status) && (
                <View style={{ marginTop: 4 }}>
                  <StatusBadge {...cardStatus(sale)} />
                </View>
              )}
            </View>
          ),
        })}
        menu={{
          showDelete(item) {
            return item.status === "cancelled";
          },
          showEdit() {
            return false;
          },
          customActions: [
            {
              title: isDownloading ? "Descargando..." : "Imprimir PDF",
              icon: "file-pdf-box",
              color: palette.primary,
              show: () => canReadSales,
              onPress: handleDownloadPdf,
            },
          ],
        }}
        searchPlaceholder="Buscar ventas..."
        columns={columns}
      />
    ),
    [navigation, columns, canReadSales],
  );

  const renderStatsRoute = useMemo(() => () => <SaleStats />, []);

  const renderScene = useMemo(
    () =>
      SceneMap({
        list: renderListRoute,
        stats: renderStatsRoute,
      }),
    [renderListRoute, renderStatsRoute],
  );

  return (
    <PermissionGate permission="sales_list">
      <View style={styles.container}>
      {/* Tabs Header (sin sales_read solo queda la lista) */}
      {canReadSales && (
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
        </View>
      )}

      {/* Tab View */}
      <TabView
        navigationState={{ index: Math.min(index, routes.length - 1), routes }}
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
    borderBottomColor: palette.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.textSecondary,
  },
  tabTextActive: {
    color: palette.primary,
  },
  rightContent: {
    alignItems: "flex-end" as const,
  },
});
