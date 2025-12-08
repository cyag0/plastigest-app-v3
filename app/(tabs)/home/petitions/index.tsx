import AppList from "@/components/App/AppList/AppList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Chip, Icon } from "react-native-paper";
import transferService from "@/utils/services/transferService";
import type { InventoryTransfer } from "@/utils/services/transferService";

export default function PetitionsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const company = auth.selectedCompany;
  
  // Detectar la ubicación actual del usuario
  // TODO: Implementar lógica para obtener la ubicación del usuario desde el backend
  // Por ahora, detectamos basado en el email del usuario
  const getCurrentLocationId = React.useCallback(() => {
    const user = auth.user;
    if (!user) return 1; // Default a Central
    
    // Mapeo basado en email del usuario
    const locationMapping: Record<string, number> = {
      'gabriel@plastigest.com': 1,        // Sucursal Central
      'sucursal.norte@plastigest.com': 2, // Sucursal Norte  
      'sucursal.sur@plastigest.com': 3,   // Sucursal Sur
    };
    
    return locationMapping[user.email] || 1; // Default a Central
  }, [auth.user]);
  
  const currentLocationId = getCurrentLocationId();
  
  // Obtener el nombre de la ubicación actual
  const getLocationName = React.useCallback(() => {
    const locationNames: Record<number, string> = {
      1: 'Central',
      2: 'Norte', 
      3: 'Sur'
    };
    return locationNames[currentLocationId] || 'Central';
  }, [currentLocationId]);

  // Actualizar el servicio cuando cambien los filtros
  React.useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [selectedStatus, currentLocationId, company?.id]);

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setRefreshKey((prev) => prev + 1);
  };

  // Crear un adaptador de servicio para que funcione con AppList
  const petitionsService = React.useMemo(() => ({
    index: async (params: any) => {
      try {
        const response = await transferService.getPetitions({
          ...params,
          company_id: company?.id || 0,
          status: selectedStatus || 'pending',
          to_location_id: currentLocationId
        });
        return { data: response };
      } catch (error) {
        console.error('Error fetching petitions:', error);
        throw error;
      }
    }
  }), [company?.id, selectedStatus, currentLocationId]);

  if (!company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Selecciona una empresa para continuar</Text>
      </View>
    );
  }

  const statuses = [
    { value: null, label: "Todas", color: "#6b7280", icon: "format-list-bulleted" },
    { value: "pending", label: "Pendientes", color: "#FF9800", icon: "clock-outline" },
    { value: "approved", label: "Aprobadas", color: "#4CAF50", icon: "check-circle-outline" },
    { value: "rejected", label: "Rechazadas", color: "#F44336", icon: "close-circle-outline" },
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
      pending: { icon: "clock-outline", color: "#FF9800", label: "Pendiente" },
      approved: { icon: "check-circle-outline", color: "#4CAF50", label: "Aprobada" },
      rejected: { icon: "close-circle-outline", color: "#F44336", label: "Rechazada" },
      cancelled: { icon: "cancel", color: "#757575", label: "Cancelada" },
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
      <AppList<InventoryTransfer>
        key={refreshKey}
        title={`📋 Peticiones Recibidas (Sucursal ${getLocationName()})`}
        service={petitionsService as any}
        searchPlaceholder="Buscar peticiones..."
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);

          return {
            title: `Petición #${item.id}`,
            subtitle: `📍 De: ${item.from_location?.name || "N/A"} → Para: ${item.to_location?.name || "N/A"}`,
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
        onItemPress={(item: InventoryTransfer) => {
          router.push(`/(tabs)/home/petitions/${item.id}` as any);
        }}
        filtersComponent={<StatusFilters />}
        onPressCreate={() => router.push("/(tabs)/home/petitions/form")}
        showFab={true}
        fabLabel="Nueva Petición"
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