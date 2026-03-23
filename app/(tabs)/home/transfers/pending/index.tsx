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
          backgroundColor: isSent ? palette.blue : palette.red,
        },
      ]}
    >
      <Text style={styles.directionBadgeText}>
        {isSent ? "YO SOLICITE" : "ME SOLICITARON"}
      </Text>
    </View>
  );
}

export default function PendingTransfersScreen() {
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
      pending: {
        icon: "clock-outline",
        color: palette.warning,
        label: "Pendiente",
      },
      approved: {
        icon: "check-circle-outline",
        color: palette.info,
        label: "Aprobada",
      },
      in_transit: {
        icon: "truck-delivery-outline",
        color: palette.primary,
        label: "En Tránsito",
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
    success: ["approved"],
    warning: "pending",
    info: "in_transit",
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
        const requesterId = item.requested_by_user_id ?? item.requested_by;
        const isRequestedByMe = requesterId === auth.user?.id;
        return <DirectionBadge isSent={isRequestedByMe} />;
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
      key: "requested_at",
      width: 140,
      render: (_, item) => formatDate(item.requested_at || ""),
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
          { label: "Pendientes" },
        ]}
        currentIndex={1}
      />
      <AppList<InventoryTransfer>
        key={refreshKey}
        title="Solicitudes Pendientes"
        service={transferService}
        defaultFilters={{
          company_id: company.id,
          mode: "pending",
          status: "pending,approved,in_transit",
        }}
        filters={[
          {
            type: "simple",
            name: "status",
            label: "Estado",
            options: [
              { label: "Todos", value: "pending,approved,in_transit" },
              { label: "Pendiente", value: "pending" },
              { label: "Aprobada", value: "approved" },
              { label: "En Tránsito", value: "in_transit" },
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
        searchPlaceholder="Buscar solicitudes..."
        columns={columns}
        actionColumnWidth={200}
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const requesterId = item.requested_by_user_id ?? item.requested_by;
          const isRequestedByMe = requesterId === auth.user?.id;
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
                <DirectionBadge isSent={isRequestedByMe} />
                <StatusBadge
                  value={item.status}
                  label={statusInfo.label}
                  match={statusVariantMatch as any}
                />
                <Text style={styles.dateText}>
                  {formatDate(item.requested_at || "")}
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
          };
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
  rightContent: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500" as const,
  },
  directionBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start" as const,
  },
  directionBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
};
