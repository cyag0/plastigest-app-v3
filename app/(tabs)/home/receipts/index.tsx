import AppList from "@/components/App/AppList/AppList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Chip, Icon } from "react-native-paper";
import transferService from "@/utils/services/transferService";
import type { InventoryTransfer } from "@/utils/services/transferService";

export default function ReceiptsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("in_transit");
  const [refreshKey, setRefreshKey] = useState(0);

  const company = auth.selectedCompany;

  // Función auxiliar para detectar ubicación del usuario
  const getCurrentLocationId = React.useCallback(() => {
    const userEmail = auth.user?.email?.toLowerCase();
    console.log('🔍 Detectando ubicación para email:', userEmail);
    
    let locationId = null;
    if (userEmail?.includes('gabriel')) locationId = 1; // Central
    if (userEmail?.includes('norte')) locationId = 2; // Norte  
    if (userEmail?.includes('sur')) locationId = 3; // Sur
    
    console.log('📍 Ubicación detectada:', locationId === 1 ? 'Central (1)' : locationId === 2 ? 'Norte (2)' : locationId === 3 ? 'Sur (3)' : 'No detectada');
    
    // TEMPORAL: Forzar Sucursal Sur para pruebas
    if (!locationId) {
      console.log('⚠️ No se detectó ubicación, forzando Sucursal Sur (3) para pruebas');
      locationId = 3;
    }
    
    return locationId;
  }, [auth.user?.email]);

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status || "in_transit");
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
    { value: "in_transit", label: "Pendientes de Recibir", color: "#FF9800", icon: "truck-delivery" },
    { value: "completed", label: "Recibidas", color: "#4CAF50", icon: "check-all" },
    { value: "rejected", label: "Rechazadas", color: "#F44336", icon: "close-circle" },
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
      in_transit: { icon: "truck-delivery", color: "#FF9800", label: "Pendiente Recepción" },
      completed: { icon: "check-all", color: "#4CAF50", label: "Recibida" },
      rejected: { icon: "close-circle", color: "#F44336", label: "Rechazada" },
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
          key={status.value}
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
      <AppList<InventoryTransfer>
        key={refreshKey}
        title="📦 Recibos de Productos"
        service={transferService}
        defaultFilters={{
          company_id: company.id,
          status: selectedStatus,
          mode: 'receipts',
          ...(getCurrentLocationId() && { to_location_id: getCurrentLocationId() })
        }}
        searchPlaceholder="Buscar recepciones..."
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
                  {item.status === 'completed' 
                    ? formatDate(item.received_at || '')
                    : formatDate(item.shipped_at || '')}
                </Text>
              </View>
            ),
            bottom: [
              {
                label: "Productos",
                value: item.details?.length || 0,
              },
              ...(item.has_differences ? [{
                label: "Diferencias",
                value: "⚠️ Sí"
              }] : []),
              ...(item.total_cost
                ? [{
                    label: "Total",
                    value: `$${(item.total_cost as number).toFixed(2)}`,
                  }]
                : []),
            ],
          };
        }}
        onItemPress={(item: InventoryTransfer) => {
          router.push(`/(tabs)/home/receipts/${item.id}` as any);
        }}
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