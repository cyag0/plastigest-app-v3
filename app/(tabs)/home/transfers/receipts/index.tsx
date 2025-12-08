import AppList from "@/components/App/AppList/AppList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Chip, Icon } from "react-native-paper";
import transferService from "@/utils/services/transferService";
import type { Transfer } from "@/utils/services/transferService";

export default function ReceiptsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string | null>("in_transit"); // Por defecto mostrar las que están en tránsito
  const [refreshKey, setRefreshKey] = useState(0);

  const company = auth.selectedCompany;

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setRefreshKey((prev) => prev + 1);
  };

  if (!company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Selecciona una empresa para continuar</Text>
      </View>
    );
  }

  const statuses = [
    { value: null, label: "Todas", color: "#6b7280", icon: "format-list-bulleted" },
    { value: "in_transit", label: "Pendientes Recepción", color: "#FFA726", icon: "truck-delivery-outline" },
    { value: "completed", label: "Recibidas", color: "#66BB6A", icon: "check-all" },
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { icon: string; color: string; label: string }> = {
      pending: { icon: "clock-outline", color: "#FFA726", label: "Pendiente" },
      approved: { icon: "check-circle-outline", color: "#42A5F5", label: "Aprobada" },
      in_transit: { icon: "truck-delivery-outline", color: "#FFA726", label: "Pendiente Recepción" },
      completed: { icon: "check-all", color: "#66BB6A", label: "Recibida" },
      cancelled: { icon: "close-circle-outline", color: "#EF5350", label: "Cancelada" },
    };
    return statusMap[status] || { icon: "help-circle-outline", color: "#9E9E9E", label: "Desconocido" };
  };

  const StatusFilters = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filtersContainer}
      contentContainerStyle={styles.filtersContent}
    >
      {statuses.map((status) => (
        <Chip
          key={status.value || "all"}
          selected={selectedStatus === status.value}
          onPress={() => handleStatusChange(status.value)}
          style={[
            styles.filterChip,
            selectedStatus === status.value && {
              backgroundColor: status.color,
              borderColor: status.color,
              borderWidth: 1,
            },
          ]}
          textStyle={[
            styles.filterChipText,
            selectedStatus === status.value && styles.filterChipTextSelected,
          ]}
          icon={status.icon as any}
          mode={selectedStatus === status.value ? "flat" : "outlined"}
        >
          {status.label}
        </Chip>
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1 }}>
      <AppList<Transfer>
        key={refreshKey}
        title="Recepciones"
        service={transferService}
        searchPlaceholder="Buscar recepciones..."
        searchKeys={["transfer_number", "from_location.name", "to_location.name"]}
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);

          return {
            title: `#${item.transfer_number}`,
            subtitle: `${item.from_location?.name || "N/A"} → ${item.to_location?.name || "N/A"}`,
            left: (
              <View style={styles.statusIconContainer}>
                <Icon
                  source={statusInfo.icon as any}
                  size={28}
                  color={statusInfo.color}
                />
              </View>
            ),
            right: (
              <View style={styles.rightContent}>
                <Chip
                  style={[styles.statusChip, { backgroundColor: statusInfo.color + "20" }]}
                  textStyle={[styles.statusText, { color: statusInfo.color }]}
                  compact
                >
                  {statusInfo.label}
                </Chip>
                <Text style={styles.dateText}>
                  {formatDate(item.transfer_date)}
                </Text>
              </View>
            ),
            bottom: [
              {
                label: "Productos",
                value: item.details?.length || 0,
              },
              ...(item.total_cost
                ? [{
                    label: "Total",
                    value: `$${parseFloat(item.total_cost).toFixed(2)}`,
                  }]
                : []),
            ],
          };
        }}
        onEdit={(item) => {
          if (item.status === "pending" || item.status === "draft") {
            router.push(`/(tabs)/home/transfers/form?id=${item.id}`);
          }
        }}
        onItemPress={(item) => {
          if (item.status === "in_transit") {
            router.push(`/(tabs)/home/transfers/receive/${item.id}` as any);
          } else {
            router.push(`/(tabs)/home/transfers/${item.id}` as any);
          }
        }}
        canEdit={false} // No permitir editar desde recepciones
        canDelete={false} // No permitir eliminar desde recepciones
        additionalParams={
          selectedStatus ? { status: selectedStatus } : {}
        }
        filtersComponent={<StatusFilters />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    maxHeight: 60,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
    borderWidth: 1,
    height: 36,
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
  },
  filterChipTextSelected: {
    color: "white",
    fontWeight: "700",
  },
  statusIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
  },
  rightContent: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
  },
});