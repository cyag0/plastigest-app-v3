import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PermissionGate from "@/components/App/PermissionGate";
import ProductionKpiCards from "@/components/Production/ProductionKpiCards";
import ProductionStatusBadge from "@/components/Production/ProductionStatusBadge";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useResponsive } from "@/hooks/useResponsive";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { SceneMap, TabView } from "react-native-tab-view";
import { parseLocalDate, formatDate } from "@/utils/dates";

const PRODUCTION_COLUMNS: AppListColumn<any>[] = [
  {
    title: "Folio",
    dataIndex: "folio",
    key: "folio",
    width: 140,
  },
  {
    title: "Fecha",
    dataIndex: "production_date",
    key: "production_date",
    width: 130,
    render: (value: any) => {
      if (!value) return "-";
      try {
        return formatDate(value);
      } catch {
        return String(value);
      }
    },
  },
  {
    title: "Responsable",
    dataIndex: "responsible_name",
    key: "responsible_name",
    width: 200,
  },
  {
    title: "Sucursal",
    dataIndex: "location_name",
    key: "location_name",
    width: 170,
  },
  {
    title: "Estado",
    dataIndex: "status",
    key: "status",
    width: 150,
    align: "center",
    render: (value: any) => <ProductionStatusBadge status={value} />,
  },
  {
    title: "Consumos",
    dataIndex: "summary.consumption_count",
    key: "consumption_count",
    width: 110,
    align: "center",
  },
  {
    title: "Productos",
    dataIndex: "summary.output_count",
    key: "output_count",
    width: 110,
    align: "center",
  },
];

export default function ProductionIndex() {
  const router = useRouter();
  const alerts = useAlerts();
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const { isMobile } = useResponsive();
  const { hasPermission } = useAuth();
  // Cancelar revierte el stock: el backend pide production_orders_update.
  const canUpdate = hasPermission("production_orders_update");
  const layout = useWindowDimensions();
  const [tabIndex, setTabIndex] = useState(0);
  const [routes] = useState([
    { key: "list", title: "Lista" },
    { key: "stats", title: "Estadísticas" },
  ]);

  const handleItem = useCallback(
    (item: any) => {
      router.push(`/(tabs)/home/production/${item.id}` as any);
    },
    [router],
  );

  const handleEdit = useCallback(
    (item: any) => {
      if (item.status !== "draft") {
        alerts.warning("Solo se pueden editar producciones en estado Borrador.");
        return;
      }
      router.push(`/(tabs)/home/production/${item.id}/edit` as any);
    },
    [router, alerts],
  );

  const handleCancel = useCallback(
    async (item: any) => {
      if (item.status === "cancelled") return false;
      const ok = await alerts.confirm(
        `¿Cancelar la producción ${item.folio}? Se revertirá el impacto en stock.`,
        { title: "Cancelar producción", okText: "Sí, cancelar" },
      );
      if (!ok) return false;
      try {
        await Services.productionOrders.cancel(item.id);
        alerts.success("Producción cancelada y stock revertido");
        return true;
      } catch (e: any) {
        // El motivo (p. ej. no hay stock para revertir) viene en `error`;
        // `message` solo dice "Error al cancelar producción".
        const data = e?.response?.data;
        alerts.error(
          "No se pudo cancelar: " +
            (data?.error ??
              data?.message ??
              (e?.response ? "Error" : "sin conexión con el servidor")),
        );
        return false;
      }
    },
    [alerts],
  );

  // Remonta la lista después de cancelar para que el estado se actualice, y
  // al cambiar de sucursal (AppList no recarga si cambian sus filtros fijos).
  const [reloadToken, setReloadToken] = useState(0);
  const companyId = company?.id;
  const locationId = selectedLocation?.id;
  const listKey = `${reloadToken}-${locationId ?? "all"}`;
  const listFilters = useMemo(
    () => ({
      ...(companyId ? { company_id: companyId } : {}),
      ...(locationId ? { location_id: locationId } : {}),
    }),
    [companyId, locationId],
  );

  // "Duplicar" y "Cancelar" vivían en un onMenuAction que AppList no soporta:
  // nunca aparecían. AppList sí muestra customActions.
  const productionMenu = useMemo(
    () => ({
      onShow: handleItem,
      onEdit: handleEdit,
      showEdit: (item: any) => item.status === "draft",
      showDelete: () => false,
      customActions: [
        {
          title: "Duplicar",
          icon: "content-copy",
          onPress: (item: any) =>
            router.push({
              pathname: "/(tabs)/home/production/form",
              params: { duplicateFrom: item.id },
            } as any),
        },
        {
          title: "Cancelar producción",
          icon: "cancel",
          color: palette.error,
          show: (item: any) => canUpdate && item.status !== "cancelled",
          onPress: async (item: any) => {
            if (await handleCancel(item)) setReloadToken((t) => t + 1);
          },
        },
      ],
    }),
    [handleItem, handleEdit, handleCancel, router, canUpdate],
  );

  const formulasButton = (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/home/production/formulas" as any)}
      activeOpacity={0.7}
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        padding: 12,
        backgroundColor: palette.accent + "11",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.accent + "33",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: palette.accent,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <MaterialCommunityIcons name="flask" size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: palette.text, fontWeight: "700" }}>
          Fórmulas y recetas
        </Text>
        <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
          Configura plantillas de ingredientes y rendimientos esperados
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={palette.textSecondary}
      />
    </TouchableOpacity>
  );

  const listScene = useMemo(
    () => () => (
      <View style={{ flex: 1 }}>
        {formulasButton}
        <AppList
          key={listKey}
          title="Producción"
          service={Services.productionOrders}
          columns={PRODUCTION_COLUMNS}
          showAppBar={isMobile ? false : undefined}
          actionColumnTitle="Acciones"
          actionColumnWidth={200}
          // AppList no conoce `queryParams`: la sucursal nunca se mandaba y
          // quien ve todas las sucursales recibía las órdenes de todas.
          defaultFilters={listFilters}
          renderCard={({ item }: { item: any }) => ({
            // Celular: folio como título y el estado debajo, sin columna de
            // ícono; antes ícono + badge + menú dejaban ~100px al texto y el
            // título se partía letra por letra.
            title: item.folio,
            description: (
              <View style={{ gap: 2 }}>
                <View style={{ alignSelf: "flex-start", marginVertical: 2 }}>
                  <ProductionStatusBadge status={item.status} />
                </View>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }} numberOfLines={1}>
                  {item.responsible_name ?? "—"} · {item.location_name ?? "—"}
                </Text>
                {item.outputs && item.outputs.length > 0 ? (
                  <Text
                    style={{ color: palette.success, fontSize: 12, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.outputs
                      .map(
                        (o: any) =>
                          `+${Number(o.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })}${o.unit_name ?? ""} ${o.product_name ?? ""}`,
                      )
                      .join(" · ")}
                  </Text>
                ) : null}
                {item.consumptions && item.consumptions.length > 0 ? (
                  <Text
                    style={{ color: palette.error, fontSize: 11, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.consumptions
                      .map(
                        (c: any) =>
                          `−${Number(c.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })}${c.unit_name ?? ""} ${c.product_name ?? ""}`,
                      )
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: item.production_date
                  ? formatDate(item.production_date)
                  : "—",
              },
            ],
          })}
          onItemPress={handleItem}
          menu={productionMenu}
          onPressCreate={() => router.push("/(tabs)/home/production/form" as any)}
          fabLabel="Nueva Producción"
        />
      </View>
    ),
    [listFilters, listKey, handleItem, productionMenu, isMobile],
  );

  const statsScene = useMemo(() => () => <ProductionKpiCards />, []);

  const renderScene = useMemo(
    () => SceneMap({ list: listScene, stats: statsScene }),
    [listScene, statsScene],
  );

  if (isMobile) {
    return (
      <PermissionGate permission="production_orders_list">
        <View style={styles.container}>
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, tabIndex === 0 && styles.tabActive]}
              onPress={() => setTabIndex(0)}
            >
              <Text style={[styles.tabText, tabIndex === 0 && styles.tabTextActive]}>
                Lista
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, tabIndex === 1 && styles.tabActive]}
              onPress={() => setTabIndex(1)}
            >
              <Text style={[styles.tabText, tabIndex === 1 && styles.tabTextActive]}>
                Estadísticas
              </Text>
            </Pressable>
          </View>
          <TabView
            navigationState={{ index: tabIndex, routes }}
            renderScene={renderScene}
            onIndexChange={setTabIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={() => null}
          />
        </View>
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permission="production_orders_list">
      <View style={{ flex: 1, backgroundColor: "transparent" as any }}>
        <ProductionKpiCards />
        {formulasButton}
        <AppList
          key={listKey}
          title="Producción"
          service={Services.productionOrders}
          columns={PRODUCTION_COLUMNS}
          actionColumnTitle="Acciones"
          actionColumnWidth={200}
          // AppList no conoce `queryParams`: la sucursal nunca se mandaba y
          // quien ve todas las sucursales recibía las órdenes de todas.
          defaultFilters={listFilters}
          renderCard={({ item }: { item: any }) => ({
            // Celular: folio como título y el estado debajo, sin columna de
            // ícono; antes ícono + badge + menú dejaban ~100px al texto y el
            // título se partía letra por letra.
            title: item.folio,
            description: (
              <View style={{ gap: 2 }}>
                <View style={{ alignSelf: "flex-start", marginVertical: 2 }}>
                  <ProductionStatusBadge status={item.status} />
                </View>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }} numberOfLines={1}>
                  {item.responsible_name ?? "—"} · {item.location_name ?? "—"}
                </Text>
                {item.outputs && item.outputs.length > 0 ? (
                  <Text
                    style={{ color: palette.success, fontSize: 12, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.outputs
                      .map(
                        (o: any) =>
                          `+${Number(o.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })}${o.unit_name ?? ""} ${o.product_name ?? ""}`,
                      )
                      .join(" · ")}
                  </Text>
                ) : null}
                {item.consumptions && item.consumptions.length > 0 ? (
                  <Text
                    style={{ color: palette.error, fontSize: 11, marginTop: 2 }}
                    numberOfLines={1}
                  >
                    {item.consumptions
                      .map(
                        (c: any) =>
                          `−${Number(c.quantity).toLocaleString("es-MX", { maximumFractionDigits: 2 })}${c.unit_name ?? ""} ${c.product_name ?? ""}`,
                      )
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: item.production_date
                  ? formatDate(item.production_date)
                  : "—",
              },
            ],
          })}
          onItemPress={handleItem}
          menu={productionMenu}
          onPressCreate={() => router.push("/(tabs)/home/production/form" as any)}
          fabLabel="Nueva Producción"
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
});
