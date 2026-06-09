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
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

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
  {
    title: "Merma %",
    dataIndex: "summary.waste_percentage",
    key: "waste_percentage",
    width: 110,
    align: "right",
    render: (value: any) => {
      if (value === null || value === undefined) {
        return (
          <Text style={{ color: palette.textSecondary, fontSize: 13 }}>—</Text>
        );
      }
      const num = Number(value);
      const color = num > 15 ? palette.error : palette.success;
      return (
        <Text style={{ color, fontSize: 13, fontWeight: "600" }}>
          {num.toFixed(1)}%
        </Text>
      );
    },
  },
];

export default function ProductionIndex() {
  const router = useRouter();
  const alerts = useAlerts();
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();

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

  return (
    <PermissionGate permission="production_orders_list">
      <View style={{ flex: 1, backgroundColor: "transparent" as any }}>
        <ProductionKpiCards />

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
            <MaterialCommunityIcons
              name="flask"
              size={20}
              color="#fff"
            />
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
                <Text
                  style={{
                    color:
                      (item.waste_percentage ?? 0) > 15
                        ? palette.error
                        : palette.success,
                    fontSize: 11,
                    marginTop: 4,
                    fontWeight: "600",
                  }}
                >
                  Merma: {Number(item.waste_percentage ?? 0).toFixed(1)}%
                </Text>
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: item.production_date
                  ? new Date(item.production_date).toLocaleDateString("es-MX")
                  : "—",
              },
              {
                label: "Folio",
                value: item.folio,
              },
            ],
          })}
          onItemPress={handleItem}
          menu={{
            onView: (item: any) => router.push(`/(tabs)/home/production/${item.id}` as any),
            onEdit: handleEdit,
            onDelete: undefined,
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
          menuExtraActions={[
            {
              key: "cancel",
              label: "Cancelar producción",
              icon: "close-circle",
              destructive: true,
              showWhen: (item: any) => item.status !== "cancelled",
            },
            {
              key: "duplicate",
              label: "Duplicar",
              icon: "content-copy",
              showWhen: (item: any) => item.status === "completed",
            },
          ]}
          onPressCreate={() => router.push("/(tabs)/home/production/form" as any)}
          fabLabel="Nueva Producción"
        />
      </View>
    </PermissionGate>
  );
}

const styles = StyleSheet.create({});
