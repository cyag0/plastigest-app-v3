import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Chip, IconButton, Text } from "react-native-paper";

export default function ShipmentsScreen() {
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
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<
      string,
      { icon: string; color: string; label: string }
    > = {
      closed: {
        icon: "check-circle",
        color: palette.success,
        label: "Entregada",
      },
      rejected: {
        icon: "close-circle",
        color: palette.error,
        label: "Rechazada",
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

  return (
    <View style={{ flex: 1 }}>
      <AppList<InventoryTransfer>
        key={refreshKey}
        title="Historial de Envíos"
        service={transferService}
        defaultFilters={{
          company_id: company.id,
          mode: "shipments",
          location_id: location.id,
        }}
        searchPlaceholder="Buscar envíos..."
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);

          return {
            title: item.transfer_number || `#${item.id}`,
            subtitle: `Hacia: ${item.to_location?.name || "N/A"}`,
            left: (
              <View style={styles.statusIconContainer}>
                <IconButton
                  icon={statusInfo.icon}
                  size={24}
                  iconColor={statusInfo.color}
                  style={{ margin: 0 }}
                />
              </View>
            ),
            right: (
              <View style={styles.rightContent}>
                <Chip
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: statusInfo.color + "15",
                      borderColor: statusInfo.color,
                    },
                  ]}
                  textStyle={[styles.statusText, { color: statusInfo.color }]}
                  compact
                  mode="outlined"
                >
                  {statusInfo.label}
                </Chip>
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
                  router.push(`/(tabs)/home/shipments/${item.id}` as any),
              },
            ],
          };
        }}
        onItemPress={(item: InventoryTransfer) => {
          router.push(`/(tabs)/home/shipments/${item.id}` as any);
        }}
      />
    </View>
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
  statusChip: {
    shadowColor: "transparent",
    elevation: 0,
  },
  statusText: {
    fontWeight: "600" as const,
  },
  dateText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500" as const,
  },
};
