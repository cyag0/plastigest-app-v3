import { formatMoney } from "@/utils/format";
import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import type { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import IconLabel from "@/components/App/IconLabel";
import StatusBadge from "@/components/App/StatusBadge";
import palette from "@/constants/palette";
import { transferStatus } from "@/constants/statuses";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

/** Dirección desde la sucursal actual: es un atributo, no un estado. */
function Direction({ isSent }: { isSent: boolean }) {
  return isSent ? (
    <IconLabel icon="arrow-up-bold-circle-outline" label="Enviada" />
  ) : (
    <IconLabel icon="arrow-down-bold-circle-outline" label="Recibida" />
  );
}

export default function HistoryTransfersScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { colors } = useTheme();
  // Abrir una transferencia pide transfers_read.
  const canRead = useCan().can("transfers_read");
  const [refreshKey, setRefreshKey] = useState(0);

  const company = auth.selectedCompany;
  const location = auth.location;

  if (!company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Selecciona una empresa para continuar</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>No se ha detectado tu ubicación</Text>
      </View>
    );
  }

  const columns: AppListColumn<InventoryTransfer>[] = [
    {
      title: "Folio",
      key: "transfer_number",
      width: 200,
      render: (_, item) => item.transfer_number || `#${item.id}`,
    },
    {
      title: "Dirección",
      key: "direction",
      width: 140,
      render: (_, item) => {
        const isSent = item.from_location_id === location.id;
        return <Direction isSent={isSent} />;
      },
    },
    {
      title: "Ubicación",
      key: "location_name",
      width: 240,
      render: (_, item) =>
        item.from_location_id === location.id
          ? item.to_location?.name || "N/A"
          : item.from_location?.name || "N/A",
    },
    {
      title: "Estado",
      key: "status",
      width: 130,
      render: (_, item) => <StatusBadge {...transferStatus(item.status)} />,
    },
    {
      title: "Fecha",
      key: "received_at",
      width: 120,
      render: (_, item) =>
        formatDate(item.received_at || item.requested_at || ""),
    },
    {
      title: "Productos",
      key: "products_count",
      width: 100,
      align: "center",
      render: (_, item) => item.details?.length || 0,
    },
    {
      title: "Total",
      key: "total_cost",
      width: 120,
      align: "right",
      render: (_, item) =>
        item.total_cost ? formatMoney(item.total_cost) : "-",
    },
  ];

  return (
    <>
 

      <AppList<InventoryTransfer>
        key={refreshKey}
        title="Historial de Transferencias"
        service={transferService}
        permissions={{ read: "transfers_read" }}
        defaultFilters={{
          company_id: company.id,
          status: "completed,rejected,cancelled",
        }}
        filters={[
          {
            type: "simple",
            name: "status",
            label: "Estado",
            options: [
              { label: "Todas", value: "completed,rejected,cancelled" },
              { label: "Completada", value: "completed" },
              { label: "Rechazada", value: "rejected" },
              { label: "Cancelada", value: "cancelled" },
            ],
          },
          {
            // Desde la sucursal actual: "sent" = salió de aquí, "received" =
            // llegó aquí (igual que la columna Enviada / Recibida).
            type: "simple",
            name: "direction",
            label: "Dirección",
            options: [
              { label: "Todas", value: "" },
              { label: "Enviadas (salieron de aquí)", value: "sent" },
              { label: "Recibidas (llegaron aquí)", value: "received" },
            ],
          },
        ]}
        searchPlaceholder="Buscar en historial..."
        columns={columns}
        actionColumnWidth={100}
        renderCard={({ item }) => {
          const isSent = item.from_location_id === location.id;
          const isReceived = item.to_location_id === location.id;

          return {
            title: `${item.transfer_number || `#${item.id}`}`,
            // Antes en subtitle, que la lista no dibuja.
            description: isSent
              ? `Destino: ${item.to_location?.name || "N/A"}`
              : `Desde: ${item.from_location?.name || "N/A"}`,
            // Solo la dirección, sin color: el estado ya va en el badge.
            left: (
              <MaterialCommunityIcons
                name={
                  isSent
                    ? "arrow-up-bold-circle-outline"
                    : isReceived
                      ? "arrow-down-bold-circle-outline"
                      : "swap-horizontal"
                }
                size={24}
                color={colors.textMuted}
              />
            ),
            right: (
              <View style={styles.rightContent}>
                <StatusBadge {...transferStatus(item.status)} />
                <Text style={styles.dateText}>
                  {formatDate(item.received_at || item.requested_at || "")}
                </Text>
              </View>
            ),
            bottom: [
              {
                label: "Productos",
                value: item.details?.length || 0,
              },
              ...(item.total_cost
                ? [
                    {
                      label: "Total",
                      value: `$${(item.total_cost as number).toFixed(2)}`,
                    },
                  ]
                : []),
            ],
            actions: canRead
              ? [
                  {
                    label: "Ver Detalle",
                    icon: "eye-outline",
                    onPress: () =>
                      router.push(`/(tabs)/home/transfers/${item.id}` as any),
                  },
                ]
              : [],
          };
        }}
        menu={{
          showDelete: false,
          showEdit: false,
        }}
        onItemPress={(item: InventoryTransfer) => {
          router.push(`/(tabs)/home/transfers/${item.id}` as any);
        }}
      />
    </>
  );
}

const styles = {
  rightContent: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500" as const,
  },
};
