import { useAuth } from "@/contexts/AuthContext";
import { formatQuantity } from "@/utils/format";
import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import IconLabel from "@/components/App/IconLabel";
import PermissionGate from "@/components/App/PermissionGate";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

interface AdjustmentsIndexProps {
  route?: Href;
}

interface InventoryAdjustmentItem {
  id: number;
  direction: "in" | "out";
  quantity: number;
  product?: {
    id: number;
    name: string;
  };
  unit?: {
    id: number;
    name: string;
    code?: string;
  };
  reason_code?: string;
  reason_code_label?: string;
  applied_at?: string;
  /** reverted_at: merma de una producción cancelada; su stock ya se devolvió. */
  content?: { reverted_at?: string | null } | null;
}

/** Motivo del ajuste, con "Revertida" si su stock ya se devolvió. */
const reasonText = (item: InventoryAdjustmentItem, label?: string) => {
  const reason = label || item.reason_code_label || item.reason_code || "Sin especificar";
  return item.content?.reverted_at ? `${reason} · Revertida` : reason;
};

const tableColumns: AppListColumn<InventoryAdjustmentItem>[] = [
  {
    title: "ID",
    dataIndex: "id",
    width: 90,
  },
  {
    title: "Producto",
    dataIndex: "product.name",
    width: 240,
  },
  {
    title: "Tipo",
    key: "direction",
    width: 170,
    // Tipo y razón son atributos del ajuste, no estados: texto con ícono.
    render: (_, item) => {
      const isIn = item.direction === "in";

      return (
        <IconLabel
          icon={isIn ? "arrow-up-bold-circle" : "arrow-down-bold-circle"}
          label={isIn ? "Entrada" : "Salida"}
        />
      );
    },
  },
  {
    title: "Cantidad",
    key: "quantity",
    width: 170,
    align: "right",
    render: (_, item) =>
      formatQuantity(item.quantity, item.unit?.code || item.unit?.name),
  },
  {
    title: "Razón",
    key: "reason",
    dataIndex: "reason_code_label",
    width: 220,
    render: (value, item) => (
      <IconLabel
        icon={getReasonIcon(item.reason_code || "")}
        label={reasonText(item, value || item.reason_code || "-")}
      />
    ),
  },
  {
    title: "Fecha",
    key: "applied_at",
    width: 130,
    render: (_, item) => formatDate(item.applied_at || "") || "-",
  },
];

export default function AdjustmentsIndex(props: AdjustmentsIndexProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectedLocation, isLoadingLocations } = useSelectedLocation();

  const route: Href = props.route || "/(tabs)/home/adjustment";
  const { hasPermission } = useAuth();
  const canManage = hasPermission("inventory_manage");

  if (isLoadingLocations) {
    return <Text>Cargando...</Text>;
  }

  return (
    // Ver la lista pide inventory_list (igual que el backend); registrar un
    // ajuste, inventory_manage.
    <PermissionGate permission="inventory_list">
      <AppList<InventoryAdjustmentItem>
      title="Ajustes de Inventario"
      service={Services.inventoryAdjustments}
      // Abrir un ajuste pide inventory_read; crear, inventory_manage.
      permissions={{ read: "inventory_read" }}
      defaultFilters={{
        location_id: selectedLocation?.id,
      }}
      filters={[
        {
          type: "simple",
          name: "direction",
          label: "Tipo",
          options: [
            { label: "Todos", value: "" },
            { label: "Entrada", value: "in" },
            { label: "Salida", value: "out" },
          ],
        },
        {
          type: "simple",
          name: "reason_code",
          label: "Razón",
          options: [
            { label: "Todas", value: "" },
            { label: "Diferencia de conteo", value: "count_diff" },
            { label: "Daño", value: "damage" },
            { label: "Pérdida", value: "loss" },
            { label: "Vencimiento", value: "expiry" },
            { label: "Robo", value: "theft" },
            { label: "Encontrado", value: "found" },
            { label: "Otro", value: "other" },
          ],
        },
      ]}
      onPressCreate={
        canManage ? () => router.push(`${route}/form` as any) : undefined
      }
      renderCard={({ item }: { item: InventoryAdjustmentItem }) => {
        const isIncrease = item.direction === "in";

        return {
          title: item.product?.name || `Ajuste #${item.id}`,
          description: (
            <>
              <AppList.Description>
                {`${Number(item.quantity || 0)} ${item.unit?.code || item.unit?.name || ""}`.trim()}
              </AppList.Description>
            </>
          ),
          right: (
            <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
              <MaterialCommunityIcons
                name={isIncrease ? "arrow-up-circle" : "arrow-down-circle"}
                size={32}
                color={isIncrease ? colors.success : colors.error}
              />
            </View>
          ),
          bottom: [
            {
              label: "Fecha",
              value: formatDate(item.applied_at || "") || "Sin fecha",
            },
            {
              label: "Acción",
              value: reasonText(item),
            },
          ],
        };
      }}
      onItemPress={(item) => router.push(`${route}/${item.id}` as any)}
      searchPlaceholder="Buscar ajustes..."
      emptyMessage="No hay ajustes registrados"
      columns={tableColumns}
      menu={{
        showView: true,
        showEdit: false,
        showDelete: false,
      }}
    />
    </PermissionGate>
  );
}

function getReasonIcon(reasonCode: string) {
  switch (reasonCode) {
    case "count_diff":
      return "scale-balance";
    case "damage":
      return "package-variant-closed-remove";
    case "loss":
      return "close-circle-outline";
    case "expiry":
      return "calendar-remove";
    case "theft":
      return "alert-octagon-outline";
    case "found":
      return "check-circle-outline";
    default:
      return "information-outline";
  }
}
