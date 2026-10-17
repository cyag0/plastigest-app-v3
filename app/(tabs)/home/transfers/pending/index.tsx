import { formatDate } from "@/utils/dates";
import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import AppList from "@/components/App/AppList/AppList";
import type { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import IconLabel from "@/components/App/IconLabel";
import StatusBadge from "@/components/App/StatusBadge";
import palette from "@/constants/palette";
import { transferStatus } from "@/constants/statuses";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

/**
 * Quién pidió, visto desde la sucursal actual: "Yo solicité" si la mercancía
 * llega aquí (la sucursal actual es el destino), "Me solicitaron" si sale de
 * aquí. Es un atributo, no un estado.
 */
function Direction({ incoming }: { incoming: boolean }) {
  return incoming ? (
    <IconLabel icon="arrow-down-bold-circle-outline" label="Yo solicité" />
  ) : (
    <IconLabel icon="arrow-up-bold-circle-outline" label="Me solicitaron" />
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

  const columns: AppListColumn<InventoryTransfer>[] = [
    {
      title: "Folio",
      key: "transfer_number",
      width: 210,
      render: (_, item) => item.transfer_number || `#${item.id}`,
    },
    {
      title: "Dirección",
      key: "direction",
      width: 150,
      render: (_, item) => <Direction incoming={item.to_location_id === location.id} />,
    },
    {
      title: "Ubicación",
      key: "location_name",
      width: 220,
      render: (_, item) =>
        item.from_location_id === location.id
          ? item.to_location?.name || "N/A"
          : item.from_location?.name || "N/A",
    },
    {
      title: "Solicitante",
      key: "requester_name",
      width: 170,
      render: (_, item) => item.requested_by_user?.name || "N/A",
    },
    {
      title: "Estado",
      key: "status",
      width: 130,
      render: (_, item) => <StatusBadge {...transferStatus(item.status)} />,
    },
    {
      title: "Fecha",
      key: "requested_at",
      width: 120,
      render: (_, item) => formatDate(item.requested_at || ""),
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
          const isSent = item.from_location_id === location.id;
          const isReceived = item.to_location_id === location.id;

          return {
            title: `${item.transfer_number || `#${item.id}`}`,
            // Antes en subtitle, que la lista no dibuja.
            description: isSent
              ? `Destino: ${item.to_location?.name || "N/A"}`
              : `Desde: ${item.from_location?.name || "N/A"}`,
            // Sin ícono a la izquierda: estado y dirección ya van a la derecha.
            right: (
              <View style={styles.rightContent}>
                {/* Igual que la columna "Dirección": por sucursal, no por
                    usuario (antes decía "Me solicitaron" si la pidió un
                    compañero de la misma sucursal). */}
                <Direction incoming={isReceived} />
                <StatusBadge {...transferStatus(item.status)} />
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
