import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import type { InventoryTransfer } from "@/utils/services/transferService";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Chip, IconButton } from "react-native-paper";

export default function PetitionsScreen() {
  const router = useRouter();
  const auth = useAuth();

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
      draft: {
        icon: "file-document-outline",
        color: palette.textSecondary,
        label: "Borrador",
      },
      ordered: {
        icon: "clock-outline",
        color: palette.warning,
        label: "Ordenado",
      },
      in_transit: {
        icon: "truck-fast-outline",
        color: palette.blue,
        label: "En Tránsito",
      },
      closed: {
        icon: "check-circle",
        color: palette.success,
        label: "Completada",
      },
      rejected: {
        icon: "close-circle",
        color: palette.red,
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
        title="Mis Peticiones"
        service={Services.transfers}
        defaultFilters={{
          mode: "petitions",
        }}
        searchPlaceholder="Buscar peticiones..."
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);

          return {
            title: item.transfer_number || `#${item.id}`,
            subtitle: `Para: ${item.to_location?.name || "N/A"}`,
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
              </View>
            ),
            bottom: [
              {
                label: "Fecha",
                value: formatDate(item.requested_at) || "Sin fecha",
              },
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
          router.push(`/(tabs)/home/petitions/${item.id}` as any);
        }}
        menu={{
          showDelete(item) {
            return false;
          },
          showEdit(item) {
            return false;
          },
        }}
        onPressCreate={() => router.push("/(tabs)/home/petitions/form")}
        showFab={true}
        fabLabel="Nueva Petición"
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
    //fontSize: 12,
    fontWeight: "600" as const,
  },
  dateText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500" as const,
  },
};
