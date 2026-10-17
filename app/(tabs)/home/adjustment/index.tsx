/**
 * Ajustes de inventario: qué se movió, por qué, quién y cuándo.
 *
 * Antes la tabla tenía ID, "Tipo" con dos íconos casi iguales y un menú ⋮
 * con solo "Ver"; en el teléfono, círculos rojo/verde enormes y "Acción:
 * Daño", sin quién ni hora. Ahora el movimiento lleva su signo ("−3 pz",
 * "+2 kg" en verde), el motivo su ícono, quién lo registró y la hora, y
 * "Deshecho" cuando se deshizo. Tocar el renglón abre el detalle.
 *
 * También la usa Inventario (inventory/adjustment) con su propia ruta.
 */

import AppList from "@/components/App/AppList/AppList";
import type { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import type { FilterConfig } from "@/components/App/AppList/AppListFilter";
import IconLabel from "@/components/App/IconLabel";
import PermissionGate from "@/components/App/PermissionGate";
import StatusBadge from "@/components/App/StatusBadge";
import {
  isReverted,
  ORIGINS,
  REASONS,
  reasonInfo,
  signedQuantity,
  whenText,
  type AdjustmentRecord,
  type OriginType,
  type ReasonCode,
} from "@/components/Adjustments/adjustmentFormat";
import { useUnitAbbreviations } from "@/components/Adjustments/adjustmentRequests";
import { dateRangeFilter } from "@/constants/listFilters";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import { useLocationFilter } from "@/hooks/useListFilters";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { shortLocationName } from "@/utils/locations";
import Services from "@/utils/services";
import type { CrudService, IndexParams, RequestOptions } from "@/utils/services/crudService";
import { type Href, useNavigation, useRouter } from "expo-router";
import React, { useLayoutEffect, useMemo } from "react";
import { Text, View } from "react-native";

interface AdjustmentsIndexProps {
  route?: Href;
}

/** Los filtros en "Todos" (vacíos) no se mandan. */
const listService: CrudService<AdjustmentRecord> = {
  ...Services.inventoryAdjustments,
  index: (params?: IndexParams, options?: RequestOptions) =>
    Services.inventoryAdjustments.index(
      Object.fromEntries(
        Object.entries(params ?? {}).filter(([, value]) => value !== "" && value !== null && value !== undefined),
      ),
      options,
    ),
};

const TYPE_FILTER: FilterConfig = {
  type: "simple",
  name: "direction",
  label: "Tipo",
  options: [
    { label: "Todos", value: "" },
    { label: "Entradas", value: "in" },
    { label: "Salidas", value: "out" },
  ],
};

const REASON_FILTER: FilterConfig = {
  type: "simple",
  name: "reason_code",
  label: "Motivo",
  options: [
    { label: "Todos", value: "" },
    ...(Object.keys(REASONS) as ReasonCode[]).map((code) => ({ label: REASONS[code].label, value: code })),
  ],
};

const ORIGIN_LABELS: Record<OriginType, string> = {
  manual: "Manual",
  production_order: "Producción",
  inventory_count: "Conteo",
  transfer: "Transferencia",
};

const ORIGIN_FILTER: FilterConfig = {
  type: "simple",
  name: "origin",
  label: "Origen",
  options: [
    { label: "Todos", value: "" },
    ...(Object.keys(ORIGINS) as OriginType[]).map((type) => ({ label: ORIGIN_LABELS[type], value: type })),
  ],
};

const STATUS_FILTER: FilterConfig = {
  type: "simple",
  name: "status",
  label: "Estado",
  options: [
    { label: "Todos", value: "" },
    { label: "Vigentes", value: "active" },
    { label: "Deshechos", value: "reverted" },
  ],
};

export default function AdjustmentsIndex(props: AdjustmentsIndexProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const { can } = useCan();
  const { selectedCompany } = useAuth();
  const base = String(props.route || "/(tabs)/home/adjustment");
  // Registrar pide inventory_manage; abrir uno, inventory_read.
  const canManage = can("inventory_manage");
  // Quien entra a todas las sucursales las ve juntas (y cada renglón dice cuál).
  const locationFilter = useLocationFilter();
  const showLocation = !!locationFilter;
  // "pz", "kg": el recurso trae la unidad sin abreviatura (se vuelve a pintar al llegar).
  useUnitAbbreviations();

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Ajustes de inventario" });
  }, [navigation]);

  const styles = useThemedStyles((c) => ({
    movement: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.text, fontVariant: ["tabular-nums"] },
    movementIn: { color: c.successStrong },
    movementMuted: { color: c.textMuted },
    cardLine: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  }));

  const movementStyle = (item: AdjustmentRecord) => [
    styles.movement,
    item.direction === "in" && styles.movementIn,
    // Lo deshecho ya no cuenta: en gris.
    isReverted(item) && styles.movementMuted,
  ];

  const locationName = (item: AdjustmentRecord) =>
    item.location?.name ? shortLocationName(item.location.name, selectedCompany?.name) : null;

  const filters = useMemo<FilterConfig[]>(
    () => [
      TYPE_FILTER,
      REASON_FILTER,
      ORIGIN_FILTER,
      dateRangeFilter,
      STATUS_FILTER,
      ...(locationFilter ? [locationFilter] : []),
    ],
    [locationFilter],
  );

  const columns: AppListColumn<AdjustmentRecord>[] = [
    {
      title: "Producto",
      key: "product",
      width: 250,
      render: (_, item) => item.product?.name ?? "Producto",
    },
    {
      title: "Movimiento",
      key: "movement",
      width: 110,
      align: "right",
      render: (_, item) => <Text style={movementStyle(item)}>{signedQuantity(item)}</Text>,
    },
    {
      title: "Motivo",
      key: "reason",
      width: 190,
      render: (_, item) => {
        const reason = reasonInfo(item.reason_code);
        return <IconLabel icon={reason.icon} label={reason.label} />;
      },
    },
    {
      title: "Registró",
      key: "user",
      width: 150,
      render: (_, item) => item.created_by_user?.name ?? null,
    },
    ...(showLocation
      ? [
          {
            title: "Sucursal",
            key: "location",
            width: 140,
            render: (_: unknown, item: AdjustmentRecord) => locationName(item),
          },
        ]
      : []),
    {
      title: "Fecha",
      key: "when",
      width: 150,
      render: (_, item) => whenText(item),
    },
    {
      title: "",
      key: "status",
      width: 100,
      // Solo los deshechos: los demás quedan en blanco (sin "—").
      render: (_, item) => (isReverted(item) ? <StatusBadge label="Deshecho" /> : <View />),
    },
  ];

  return (
    // Ver la lista pide inventory_list (igual que el backend).
    <PermissionGate permission="inventory_list">
      <AppList<AdjustmentRecord>
        title="Ajustes de inventario"
        service={listService}
        permissions={{ read: "inventory_read", create: "inventory_manage" }}
        filters={filters}
        onPressCreate={canManage ? () => router.push(`${base}/form` as any) : undefined}
        onItemPress={(item) => router.push(`${base}/${item.id}` as any)}
        searchPlaceholder="Buscar por producto o nota"
        emptyMessage="No hay ajustes que mostrar"
        columns={columns}
        // Sin menú ⋮: tocar el renglón abre el detalle.
        menu={{ showView: false, showEdit: false, showDelete: false }}
        renderCard={({ item }) => {
          const reason = reasonInfo(item.reason_code);
          return {
            title: item.product?.name ?? "Producto",
            description: (
              <Text style={styles.cardLine}>
                <Text style={movementStyle(item)}>{signedQuantity(item)}</Text>
                {` · ${reason.label}`}
              </Text>
            ),
            right: isReverted(item) ? <StatusBadge label="Deshecho" /> : undefined,
            bottom: [
              {
                label: "",
                value: [whenText(item), item.created_by_user?.name, showLocation ? locationName(item) : null]
                  .filter(Boolean)
                  .join(" · "),
              },
            ],
          };
        }}
      />
    </PermissionGate>
  );
}
