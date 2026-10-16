import { formatDate } from "@/utils/dates";
import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import AppList from "@/components/App/AppList/AppList";
import type { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import type { VariantMatchMap } from "@/components/App/StatusBadge";
import StatusBadge from "@/components/App/StatusBadge";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Badge, IconButton, Text } from "react-native-paper";

/**
 * Quién pidió, visto desde la sucursal actual: "YO SOLICITE" si la mercancía
 * llega aquí (la sucursal actual es el destino), "ME SOLICITARON" si sale de
 * aquí.
 */
function DirectionBadge({ isSent }: { isSent: boolean }) {
  return (
    <View
      style={[
        styles.directionBadge,
        {
          backgroundColor: isSent ? palette.blue : palette.error,
        },
      ]}
    >
      <Text style={styles.directionBadgeText}>
        {isSent ? "YO SOLICITE" : "ME SOLICITARON"}
      </Text>
    </View>
  );
}

/** Estados que el backend deja cancelar (TransferStatus::canCancel). */
const CANCELLABLE_STATUSES = ["pending", "approved", "in_transit"];

export default function PendingTransfersScreen() {
  const router = useRouter();
  const auth = useAuth();
  const alerts = useAlerts();
  const { can } = useCan();
  const allLocations = useAllLocationsAccess();
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

  // Una solicitud en curso se puede cancelar (no eliminar): queda en el
  // historial como cancelada. Si ya iba en tránsito, el backend regresa lo
  // enviado al stock de origen. Las finalizadas no se borran para no perder
  // la trazabilidad del inventario.
  const handleCancel = async (item: InventoryTransfer) => {
    const inTransit = item.status === "in_transit";
    const ok = await alerts.confirm(
      `¿Cancelar la transferencia ${item.transfer_number || `#${item.id}`}?` +
        (inTransit
          ? " La mercancía enviada regresará al inventario de origen."
          : ""),
      { title: "Cancelar transferencia", okText: "Sí, cancelar", cancelText: "Volver" },
    );
    if (!ok) return;
    try {
      await transferService.destroy(item.id);
      alerts.success("Transferencia cancelada");
      setRefreshKey((k) => k + 1);
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message || "No se pudo cancelar la transferencia",
      );
    }
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
        const isSent = item.to_location_id === location.id;
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
      title: "Solicitante",
      key: "requester_name",
      width: 200,
      render: (_, item) => item.requested_by_user?.name || "N/A",
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
      
      <AppList<InventoryTransfer>
        key={refreshKey}
        title="Solicitudes Pendientes"
        service={transferService}
        permissions={{ read: "transfers_read" }}
        defaultFilters={{
          company_id: company.id,
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
            // Desde la sucursal actual: "received" = la mercancía llega aquí
            // (lo que yo pedí), "sent" = sale de aquí (lo que me pidieron).
            type: "simple",
            name: "direction",
            label: "Dirección",
            options: [
              { label: "Todas", value: "" },
              { label: "Yo solicité (llegan aquí)", value: "received" },
              { label: "Me solicitaron (salen de aquí)", value: "sent" },
            ],
          },
        ]}
        searchPlaceholder="Buscar solicitudes..."
        columns={columns}
        actionColumnWidth={200}
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
                {/* Igual que la columna "Dirección": por sucursal, no por
                    usuario (antes decía "ME SOLICITARON" si la pidió un
                    compañero de la misma sucursal). */}
                <DirectionBadge isSent={isReceived} />
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
        menu={{
          onShow: (item: InventoryTransfer) =>
            router.push(`/(tabs)/home/transfers/${item.id}` as any),
          showView: true,
          showEdit: false,
          showDelete: false,
          customActions: [
            {
              title: "Cancelar solicitud",
              icon: "close-circle-outline",
              color: palette.error,
              // Como el backend (destroy): transfers_delete, desde la sucursal
              // de origen o la de destino (o con acceso a todas), y mientras
              // esté pendiente, aprobada o en tránsito.
              show: (item: InventoryTransfer) =>
                can("transfers_delete") &&
                CANCELLABLE_STATUSES.includes(String(item.status)) &&
                (allLocations ||
                  Number(item.from_location_id) === Number(location.id) ||
                  Number(item.to_location_id) === Number(location.id)),
              onPress: handleCancel,
            },
          ],
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
