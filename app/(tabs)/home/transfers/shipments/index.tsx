import AppList from "@/components/App/AppList/AppList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Chip, Icon } from "react-native-paper";
import transferService from "@/utils/services/transferService";
import type { Transfer } from "@/utils/services/transferService";

export default function ShipmentsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
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
    { value: "pending", label: "Pendientes", color: "#FFA726", icon: "clock-outline" },
    { value: "approved", label: "Listas para Envío", color: "#42A5F5", icon: "check-circle-outline" },
    { value: "in_transit", label: "En Tránsito", color: "#FFA726", icon: "truck-delivery-outline" },
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
      approved: { icon: "check-circle-outline", color: "#42A5F5", label: "Lista para Envío" },
      in_transit: { icon: "truck-delivery-outline", color: "#FFA726", label: "En Tránsito" },
      completed: { icon: "check-all", color: "#66BB6A", label: "Completada" },
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
        title="Envíos"
        service={transferService}
        searchPlaceholder="Buscar envíos..."
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
                  {formatDate(item.created_at || '')}
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
                    value: `$${(item.total_cost as number).toFixed(2)}`,
                  }]
                : []),
            ],
          };
        }}
        onItemPress={(item: Transfer) => {
          if (item.status === "approved") {
            router.push(`/(tabs)/home/transfers/ship/${item.id}` as any);
          } else {
            router.push(`/(tabs)/home/transfers/${item.id}` as any);
          }
        }}
        filtersComponent={<StatusFilters />}
        onPressCreate={() => router.push("/(tabs)/home/transfers/form")}
        showFab={true}
        fabLabel="Nueva Transferencia"
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
    backgroundColor: "#f8f9fa",
    borderColor: "#dee2e6",
    borderWidth: 1,
    height: 40,
    elevation: 2,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#495057",
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
    backgroundColor: "#f8f9fa",
    elevation: 1,
  },
  rightContent: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusChip: {
    height: 26,
    elevation: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#6c757d",
    fontWeight: "500",
  },
});