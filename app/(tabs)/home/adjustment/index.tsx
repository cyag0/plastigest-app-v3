import { useAuth } from "@/contexts/AuthContext";
import { formatQuantity } from "@/utils/format";
import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PermissionGate from "@/components/App/PermissionGate";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
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
}

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
    render: (_, item) => {
      const isIn = item.direction === "in";

      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            backgroundColor: isIn ? palette.success : palette.error,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <MaterialCommunityIcons
            name={isIn ? "arrow-up-bold-circle" : "arrow-down-bold-circle"}
            size={14}
            color="#fff"
          />
          <Text
            variant="labelSmall"
            style={{ color: "#fff", fontWeight: "700" }}
          >
            {isIn ? "Entrada" : "Salida"}
          </Text>
        </View>
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
    render: (value, item) => {
      const reasonCode = item.reason_code || "";
      const reasonBadge = getReasonBadgeStyle(reasonCode);

      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            backgroundColor: reasonBadge.backgroundColor,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <MaterialCommunityIcons
            name={getReasonIcon(reasonCode)}
            size={15}
            color="#fff"
          />
          <Text
            variant="labelSmall"
            style={{ color: "#fff", fontWeight: "700" }}
          >
            {value || item.reason_code || "-"}
          </Text>
        </View>
      );
    },
  },
  {
    title: "Fecha",
    key: "applied_at",
    width: 130,
    render: (_, item) => formatDate(item.applied_at || "") || "-",
  },
];

export default function AdjustmentsIndex(props: AdjustmentsIndexProps) {
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
                color={isIncrease ? palette.success : palette.error}
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
              value: item.reason_code_label || item.reason_code || "Sin especificar",
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

function getReasonBadgeStyle(reasonCode: string) {
  switch (reasonCode) {
    case "count_diff":
      return { backgroundColor: "#6E6B5E" };
    case "damage":
      return { backgroundColor: "#9A6210" };
    case "loss":
      return { backgroundColor: "#B9412C" };
    case "expiry":
      return { backgroundColor: "#9A3412" };
    case "theft":
      return { backgroundColor: "#7F1D1D" };
    case "found":
      return { backgroundColor: "#3F8A3A" };
    default:
      return { backgroundColor: "#57564B" };
  }
}
