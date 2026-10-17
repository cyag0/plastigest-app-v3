import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList";
import PermissionGate from "@/components/App/PermissionGate";
import StatusBadge from "@/components/App/StatusBadge";
import { salesOrderStatus } from "@/constants/statuses";
import { useTheme } from "@/contexts/ThemeContext";
import Services from "@/utils/services";
import { kioskOrderLabel } from "@/utils/services/kioskOrders";
import { router } from "expo-router";
import { View } from "react-native";
import { Text } from "react-native-paper";

/**
 * Estados del pedido (SalesOrderStatus del backend) para el filtro; la
 * etiqueta y el tono del badge salen de salesOrderStatus.
 * Antes la lista los pedía a sales-orders/initial-data, que además bajaba
 * todo el catálogo y los clientes, y ahora pide permiso de crear pedidos.
 */
const STATUSES = ["pending", "preparing", "in_transit", "delivered", "cancelled"].map(
  (value) => ({ value, label: salesOrderStatus(value).label }),
);

/** "Pedido del kiosko 7 · Juan", "Juan" o null. */
function orderCustomer(order: any): string | null {
  const kiosk =
    order.channel === "kiosk" && order.ticket_number != null ? kioskOrderLabel(order.ticket_number) : null;
  const name = order.customer_name || order.customer?.name || null;
  return [kiosk, name].filter(Boolean).join(" · ") || null;
}

export default function SalesOrdersIndex() {
  const navigation = router;
  const { colors } = useTheme();

  return (
    <PermissionGate permission="sales_orders_list">
      <AppList
        title="Pedidos"
        service={Services.salesOrders}
        filters={[
          {
            type: "simple",
            name: "status",
            label: "Estado",
            options: [
              { label: "Todos", value: "" },
              ...STATUSES.map((s) => ({ label: s.label, value: s.value })),
            ],
          },
          {
            type: "dateRange",
            // "date" → date_from/date_to, que es lo que lee CrudController
            // (date_range_* se ignoraba y el filtro no hacía nada).
            name: "date",
            label: "Rango de Fechas",
            placeholder: "Seleccionar fechas",
          },
        ]}
        permissionPrefix="sales_orders"
        // Sin «+»: el alta de pedidos era el kiosko viejo. Los pedidos del
        // kiosko de autoservicio llegan solos y se cobran en el punto de venta.
        onItemPress={(entity) => {
          navigation.push(`/home/sales-orders/${entity.id}`);
        }}
        renderCard={({ item: order }: { item: any }) => ({
          title: (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text variant="bodyLarge" style={{ fontWeight: "600", flex: 1 }}>
                {order.order_number}
              </Text>
              <StatusBadge {...salesOrderStatus(order.status)} />
            </View>
          ),
          description: (
            <View style={{ gap: 4, marginTop: 4 }}>
              <Text
                variant="bodyMedium"
                style={{ color: colors.text }}
                numberOfLines={1}
              >
                {orderCustomer(order) || "Cliente sin nombre"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 4,
                }}
              >
                {order.order_date && (
                  <Text
                    variant="bodySmall"
                    style={{ color: colors.textSecondary }}
                  >
                    {formatDate(order.order_date)}
                  </Text>
                )}
              </View>
            </View>
          ),
          right: (
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text
                variant="titleMedium"
                style={{
                  color: colors.primary,
                  fontWeight: "bold",
                }}
              >
                {new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(Number(order.total_amount ?? 0))}
              </Text>
              {order.sale_id && (
                <Text
                  variant="bodySmall"
                  style={{ color: colors.success }}
                >
                  Cobrado
                </Text>
              )}
            </View>
          ),
        })}
        menu={{
          showDelete: (item: any) => item?.status === "pending",
          showEdit: (item: any) => item?.status === "pending",
        }}
        searchPlaceholder="Buscar pedidos..."
        defaultFilters={{
          scheduleOnRuntime: "-order_date",
        }}
        columns={[
          {
            title: "Folio",
            dataIndex: "order_number",
            key: "order_number",
            width: 140,
          },
          {
            title: "Estado",
            dataIndex: "status",
            key: "status",
            width: 130,
            render: (value: string) => <StatusBadge {...salesOrderStatus(value)} />,
          },
          {
            title: "Cliente",
            key: "customer",
            width: 180,
            render: (_: any, order: any) => orderCustomer(order) || "—",
          },
          {
            title: "Fecha",
            dataIndex: "order_date",
            key: "order_date",
            width: 120,
            render: (value: string) =>
              value
                ? formatDate(value)
                : "—",
          },
          {
            title: "Total",
            dataIndex: "total_amount",
            key: "total_amount",
            width: 130,
            align: "right",
            render: (value: number) =>
              new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(Number(value ?? 0)),
          },
        ]}
      />
    </PermissionGate>
  );
}
