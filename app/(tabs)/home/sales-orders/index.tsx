import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList";
import PermissionGate from "@/components/App/PermissionGate";
import palette from "@/constants/palette";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Chip, Text } from "react-native-paper";

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

export default function SalesOrdersIndex() {
  const navigation = router;
  const { can } = useCan();
  // El kiosco (nuevo pedido) cobra al momento: pide crear y actualizar.
  const canUseKiosk = can(["sales_orders_create", "sales_orders_update"], { all: true });

  const [statuses, setStatuses] = useState<StatusOption[]>([]);

  useEffect(() => {
    let mounted = true;
    Services.salesOrders
      .getInitialData()
      .then((res) => {
        if (!mounted) return;
        const data = res?.data ?? res;
        setStatuses(data?.statuses ?? []);
      })
      .catch(() => {
        // initial-data is optional for the index; silent fallback
      });
    return () => {
      mounted = false;
    };
  }, []);

  const statusColor = (value?: string) =>
    statuses.find((s) => s.value === value)?.color ?? palette.textSecondary;
  const statusLabel = (value?: string) =>
    statuses.find((s) => s.value === value)?.label ?? value ?? "—";
  
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
              ...statuses.map((s) => ({ label: s.label, value: s.value })),
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
        onPressCreate={canUseKiosk ? () => navigation.push("/home/sales-orders/kiosk") : undefined}
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
              <Chip
                compact
                style={{
                  backgroundColor: statusColor(order.status) + "22",
                }}
                textStyle={{ color: statusColor(order.status), fontSize: 12 }}
              >
                {statusLabel(order.status)}
              </Chip>
            </View>
          ),
          description: (
            <View style={{ gap: 4, marginTop: 4 }}>
              <Text
                variant="bodyMedium"
                style={{ color: palette.text }}
                numberOfLines={1}
              >
                {order.customer_name_snapshot ||
                  order.customer?.name ||
                  "Cliente sin nombre"}
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
                    style={{ color: palette.textSecondary }}
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
                  color: palette.primary,
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
                  style={{ color: palette.success }}
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
            render: (value: string) => (
              <Chip
                compact
                style={{ backgroundColor: statusColor(value) + "22" }}
                textStyle={{ color: statusColor(value), fontSize: 12 }}
              >
                {statusLabel(value)}
              </Chip>
            ),
          },
          {
            title: "Cliente",
            key: "customer",
            width: 180,
            render: (_: any, order: any) =>
              order.customer_name_snapshot ||
              order.customer?.name ||
              "—",
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
