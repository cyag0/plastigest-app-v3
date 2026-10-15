import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { FilterConfig } from "@/components/App/AppList/AppListFilter";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { formatDateTime } from "@/utils/dates";
import { routeForDocument } from "@/utils/documentRoutes";
import { downloadFile } from "@/utils/downloadFile";
import { formatQuantity } from "@/utils/format";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Icon, Text } from "react-native-paper";

type Movement = App.Entities.StockMovement;

/**
 * Kárdex general: todos los movimientos de inventario (ventas, compras,
 * traspasos, producción, ajustes, conteos) con filtros y exportación a CSV.
 *
 * El de un solo producto vive en inventory/products/[id]/movements.
 */
export default function KardexScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const [options, setOptions] = useState<App.Entities.KardexFilters | null>(null);
  const [exporting, setExporting] = useState(false);
  // Últimos filtros aplicados en la lista (para exportar lo mismo que se ve).
  const [lastParams, setLastParams] = useState<Record<string, any>>({});

  useEffect(() => {
    Services.inventoryMovements
      .filters()
      .then(setOptions)
      .catch(() => setOptions({ reasons: [], users: [], locations: [], can_choose_location: false }));
  }, []);

  // El servicio de la lista, envuelto para recordar los filtros vigentes.
  const service = useMemo(
    () => ({
      ...Services.inventoryMovements,
      index: (params?: any) => {
        setLastParams(params ?? {});
        return Services.inventoryMovements.index(params);
      },
    }),
    [],
  );

  const filters = useMemo<FilterConfig[]>(() => {
    if (!options) return [];
    const list: FilterConfig[] = [
      { name: "date", label: "Fecha", type: "dateRange" },
      { name: "reason", label: "Movimiento", type: "multiple", options: options.reasons },
      {
        name: "direction",
        label: "Sentido",
        type: "simple",
        options: [
          { label: "Entradas", value: "in" },
          { label: "Salidas", value: "out" },
        ],
      },
      { name: "user_id", label: "Usuario", type: "simple", options: options.users },
    ];
    if (options.can_choose_location) {
      list.splice(1, 0, {
        name: "location_id",
        label: "Sucursal",
        type: "simple",
        options: [{ label: "Todas las sucursales", value: "all" }, ...options.locations],
      });
    }
    return list;
  }, [options]);

  const openDocument = (item: Movement) => {
    const route = routeForDocument(item.reference?.type, item.reference?.id);
    if (route) router.push(route as any);
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const { page, per_page, paginated, ...params } = lastParams;
      const url = await Services.inventoryMovements.exportUrl(params);
      await downloadFile(url, `kardex-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
    } catch (e: any) {
      alerts.error(e?.response?.data?.message || "No se pudo exportar el kárdex");
    } finally {
      setExporting(false);
    }
  };

  const quantity = (item: Movement) => {
    const isIn = item.direction === "in";
    return (
      <Text style={{ color: isIn ? colors.success : colors.error, fontWeight: "700" }}>
        {isIn ? "+" : "−"}
        {formatQuantity(item.quantity, item.product?.unit)}
      </Text>
    );
  };

  const reasonCell = (item: Movement) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon source={item.reason_icon} size={16} color={item.direction === "in" ? colors.success : colors.error} />
      <Text variant="bodySmall" style={{ color: colors.text }}>
        {item.reason_label}
      </Text>
    </View>
  );

  const columns = useMemo<AppListColumn<Movement>[]>(
    () => [
      { title: "Fecha", key: "date", width: 165, render: (_, m) => formatDateTime(m.date) },
      {
        title: "Producto",
        key: "product",
        width: 220,
        render: (_, m) => (
          <View>
            <Text variant="bodySmall" style={{ color: colors.text, fontWeight: "600" }} numberOfLines={1}>
              {m.product?.name ?? "—"}
            </Text>
            {!!m.product?.code && (
              <Text variant="labelSmall" style={{ color: colors.textMuted }}>
                {m.product.code}
              </Text>
            )}
          </View>
        ),
      },
      { title: "Movimiento", key: "reason", width: 170, render: (_, m) => reasonCell(m) },
      { title: "Cantidad", key: "quantity", width: 100, align: "right", render: (_, m) => quantity(m) },
      {
        title: "Existencia",
        key: "stock",
        width: 120,
        align: "right",
        render: (_, m) => `${formatQuantity(m.previous_stock)} → ${formatQuantity(m.new_stock)}`,
      },
      {
        // Sucursal y usuario juntos: separados, la tabla no cabía en pantalla.
        title: "Sucursal · Usuario",
        key: "location",
        width: 200,
        render: (_, m) => (
          // Ancho fijo: un traspaso ("Matriz → Guayabitos") se salía de la celda.
          <View style={{ width: 176, overflow: "hidden" }}>
            <Text variant="bodySmall" style={{ color: colors.text }} numberOfLines={1}>
              {m.location?.name ?? "—"}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.textMuted }} numberOfLines={1}>
              {m.counterpart_location ? `${m.direction === "in" ? "desde" : "hacia"} ${m.counterpart_location.name} · ` : ""}
              {m.user?.name ?? "Sistema"}
            </Text>
          </View>
        ),
      },
      {
        title: "Documento",
        key: "reference",
        width: 190,
        render: (_, m) => (
          <Text variant="bodySmall" style={{ color: colors.text, width: 176 }} numberOfLines={1}>
            {m.reference?.label ?? m.notes ?? "—"}
          </Text>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: tokens.spacing[2],
          paddingHorizontal: tokens.spacing[4],
          paddingTop: tokens.spacing[3],
        }}
      >
        <Button mode="outlined" icon="file-delimited-outline" compact onPress={exportCsv} loading={exporting} disabled={exporting}>
          Exportar
        </Button>
      </View>

      {options && (
        <AppList<Movement>
          title="Kárdex"
          service={service as any}
          showAppBar={false}
          searchPlaceholder="Buscar producto o código..."
          emptyMessage="No hay movimientos con estos filtros."
          filters={filters}
          columns={columns}
          actionColumnTitle=""
          actionColumnWidth={56}
          itemsPerPage={25}
          onItemPress={openDocument}
          menu={{
            showView: (m) => !!routeForDocument(m.reference?.type, m.reference?.id),
            showEdit: false,
            showDelete: false,
          }}
          renderCard={({ item: m }) => ({
            title: <AppList.Title>{m.product?.name ?? "Producto"}</AppList.Title>,
            description: (
              <View style={{ gap: 2 }}>
                {reasonCell(m)}
                {!!m.reference?.label && (
                  <AppList.Description>{m.reference.label}</AppList.Description>
                )}
              </View>
            ),
            right: quantity(m),
            bottom: [
              { label: "Fecha", value: formatDateTime(m.date) },
              { label: "Existencia", value: `${formatQuantity(m.previous_stock)} → ${formatQuantity(m.new_stock)}` },
              { label: "", value: m.location?.name ?? "—" },
              { label: "", value: m.user?.name ?? "Sistema" },
            ],
          })}
        />
      )}
    </View>
  );
}
