import AppList, {
  AppListColumn,
} from "@/components/App/AppList/AppList";
import PermissionGate from "@/components/App/PermissionGate";
import ProductionKpiCards from "@/components/Production/ProductionKpiCards";
import ProductionStatusBadge from "@/components/Production/ProductionStatusBadge";
import palette from "@/constants/palette";
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
        return new Date(value).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
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
      if (item.status === "cancelled") return;
      const ok = await alerts.confirm(
        `¿Cancelar la producción ${item.folio}? Se revertirá el impacto en stock.`,
        { title: "Cancelar producción", okText: "Sí, cancelar" },
      );
      if (!ok) return;
      try {
        await Services.productionOrders.cancel(item.id);
        alerts.success("Producción cancelada y stock revertido");
      } catch (e: any) {
        alerts.error("No se pudo cancelar: " + (e?.message ?? "Error"));
      }
    },
    [alerts],
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
          title="Producción"
          service={Services.productionOrders}
          columns={PRODUCTION_COLUMNS}
          showAppBar={isMobile ? false : undefined}
          actionColumnTitle="Acciones"
          actionColumnWidth={200}
          queryParams={{
            ...(company?.id ? { company_id: company.id } : {}),
            ...(selectedLocation?.id ? { location_id: selectedLocation.id } : {}),
          }}
          renderCard={({ item }: { item: any }) => ({
            title: `Producción ${item.folio}`,
            description: (
              <View>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
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
            left: (
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: palette.primary + "22",
                }}
              >
                <MaterialCommunityIcons
                  name="factory"
                  size={26}
                  color={palette.primary}
                />
              </View>
            ),
            right: (
              <View style={{ alignItems: "flex-end" }}>
                <ProductionStatusBadge status={item.status} />
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: item.production_date
                  ? new Date(item.production_date).toLocaleDateString("es-MX")
                  : "—",
              },
              { label: "Folio", value: item.folio },
            ],
          })}
          onItemPress={handleItem}
          menu={{
            onView: (item: any) => router.push(`/(tabs)/home/production/${item.id}` as any),
            onEdit: handleEdit,
            onDelete: undefined,
            showEdit: (item: any) => item.status === "draft",
            showDelete: (item: any) => item.status === "draft",
          }}
          onMenuAction={async (action: string, item: any) => {
            if (action === "cancel") {
              await handleCancel(item);
            } else if (action === "duplicate") {
              router.push({
                pathname: "/(tabs)/home/production/form",
                params: { duplicateFrom: item.id },
              } as any);
            }
          }}
          onPressCreate={() => router.push("/(tabs)/home/production/form" as any)}
          fabLabel="Nueva Producción"
        />
      </View>
    ),
    [company, selectedLocation, handleItem, handleEdit, handleCancel, isMobile],
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
          title="Producción"
          service={Services.productionOrders}
          columns={PRODUCTION_COLUMNS}
          actionColumnTitle="Acciones"
          actionColumnWidth={200}
          queryParams={{
            ...(company?.id ? { company_id: company.id } : {}),
            ...(selectedLocation?.id ? { location_id: selectedLocation.id } : {}),
          }}
          renderCard={({ item }: { item: any }) => ({
            title: `Producción ${item.folio}`,
            description: (
              <View>
                <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
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
            left: (
              <View
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  backgroundColor: palette.primary + "22",
                }}
              >
                <MaterialCommunityIcons
                  name="factory"
                  size={26}
                  color={palette.primary}
                />
              </View>
            ),
            right: (
              <View style={{ alignItems: "flex-end" }}>
                <ProductionStatusBadge status={item.status} />
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: item.production_date
                  ? new Date(item.production_date).toLocaleDateString("es-MX")
                  : "—",
              },
              { label: "Folio", value: item.folio },
            ],
          })}
          onItemPress={handleItem}
          menu={{
            onView: (item: any) => router.push(`/(tabs)/home/production/${item.id}` as any),
            onEdit: handleEdit,
            onDelete: undefined,
            showEdit: (item: any) => item.status === "draft",
            showDelete: (item: any) => item.status === "draft",
          }}
          onMenuAction={async (action: string, item: any) => {
            if (action === "cancel") {
              await handleCancel(item);
            } else if (action === "duplicate") {
              router.push({
                pathname: "/(tabs)/home/production/form",
                params: { duplicateFrom: item.id },
              } as any);
            }
          }}
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
