import AppList from "@/components/App/AppList/AppList";
import type { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import type { VariantMatchMap } from "@/components/App/StatusBadge";
import StatusBadge from "@/components/App/StatusBadge";
import Breadcrumb from "@/components/Transfers/Breadcrumb";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Badge, IconButton, Text } from "react-native-paper";

function DirectionBadge({ isSent }: { isSent: boolean }) {
  return (
    <View
      style={[
        styles.directionBadge,
        {
          backgroundColor: isSent ? palette.blue : palette.primary,
        },
      ]}
    >
      <Text style={styles.directionBadgeText}>{isSent ? "ENVIADO" : "RECIBIDO"}</Text>
    </View>
  );
}

export default function HistoryTransfersScreen() {
  const router = useRouter();
  const auth = useAuth();
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<
      string,
      { icon: string; color: string; label: string }
    > = {
      completed: {
        icon: "check-circle",
        color: palette.success,
        label: "Completada",
      },
      rejected: {
        icon: "close-circle",
        color: palette.error,
        label: "Rechazada",
      },
      cancelled: {
        icon: "cancel",
        color: palette.textSecondary,
        label: "Cancelada",
      },
    };

    return (
      statusMap[status] || {
        icon: "help-circle-outline",
        color: palette.textSecondary,
        label: status,
      }
    );
  };

  const statusVariantMatch: VariantMatchMap = {
    success: ["completed"],
    error: ["rejected", "cancelled"],
  };

  const columns: AppListColumn<InventoryTransfer>[] = [
    {
      title: "Folio",
      key: "transfer_number",
      width: 160,
      render: (_, item) => item.transfer_number || `#${item.id}`,
    },
    {
      title: "Dirección",
      key: "direction",
      width: 200,
      render: (_, item) => {
        const isSent = item.from_location_id === location.id;
        return <DirectionBadge isSent={isSent} />;
      },
    },
    {
      title: "Ubicación",
      key: "location_name",
      width: 250,
      render: (_, item) =>
        item.from_location_id === location.id
          ? item.to_location?.name || "N/A"
          : item.from_location?.name || "N/A",
    },
    {
      title: "Estado",
      key: "status",
      width: 170,
      render: (_, item) => {
        const statusInfo = getStatusInfo(item.status);
        return (
          <StatusBadge
            value={item.status}
            label={statusInfo.label}
            match={statusVariantMatch as any}
          />
        );
      },
    },
    {
      title: "Fecha",
      key: "received_at",
      width: 140,
      render: (_, item) =>
        formatDate(item.received_at || item.requested_at || ""),
    },
    {
      title: "Productos",
      key: "products_count",
      width: 120,
      align: "center",
      render: (_, item) => item.details?.length || 0,
    },
    {
      title: "Total",
      key: "total_cost",
      width: 140,
      align: "right",
      render: (_, item) =>
        item.total_cost ? `$${(item.total_cost as number).toFixed(2)}` : "-",
    },
  ];

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Transferencias", route: "/(tabs)/home/transfers" },
          { label: "Historial" },
        ]}
        currentIndex={1}
      />

      <AppList<InventoryTransfer>
        key={refreshKey}
        title="Historial de Transferencias"
        service={transferService}
        defaultFilters={{
          company_id: company.id,
          mode: "history",
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
            type: "simple",
            name: "direction",
            label: "Dirección",
            options: [
              { label: "Todas", value: "" },
              { label: "Enviadas", value: "sent" },
              { label: "Recibidas", value: "received" },
            ],
          },
        ]}
        searchPlaceholder="Buscar en historial..."
        columns={columns}
        actionColumnWidth={100}
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const isSent = item.from_location_id === location.id;
          const isReceived = item.to_location_id === location.id;

          return {
            title: `${item.transfer_number || `#${item.id}`}`,
            subtitle: isSent
              ? `Destino: ${item.to_location?.name || "N/A"}`
              : `Desde: ${item.from_location?.name || "N/A"}`,
            left: (
              <View style={styles.statusIconContainer}>
                <IconButton
                  icon={statusInfo.icon}
                  size={24}
                  iconColor={statusInfo.color}
                  style={{ margin: 0 }}
                />
                {isSent && (
                  <Badge
                    size={16}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: palette.primary,
                    }}
                  >
                    ↑
                  </Badge>
                )}
                {isReceived && (
                  <Badge
                    size={16}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: palette.success,
                    }}
                  >
                    ↓
                  </Badge>
                )}
              </View>
            ),
            right: (
              <View style={styles.rightContent}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusInfo.color + "20",
                      borderColor: statusInfo.color,
                    },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusInfo.color }]}
                  >
                    {statusInfo.label.toUpperCase()}
                  </Text>
                </View>
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
            actions: [
              {
                label: "Ver Detalle",
                icon: "eye-outline",
                onPress: () =>
                  router.push(`/(tabs)/home/transfers/${item.id}` as any),
              },
            ],
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
  statusIconContainer: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.surface,
    shadowColor: "transparent",
  },
  directionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start" as const,
  },
  directionBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  rightContent: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold" as const,
  },
  dateText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500" as const,
  },
};
