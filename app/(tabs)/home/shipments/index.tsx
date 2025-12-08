import AppList from "@/components/App/AppList/AppList";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text, Chip, Icon, Card } from "react-native-paper";
import transferService from "@/utils/services/transferService";
import type { InventoryTransfer } from "@/utils/services/transferService";

export default function ShipmentsScreen() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const auth = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const company = auth.selectedCompany;
  
  // Detectar la ubicación actual del usuario
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

  useEffect(() => {
    if (highlight) {
      setHighlightedId(Number(highlight));
      // Mostrar mensaje informativo
      setTimeout(() => {
        Alert.alert(
          "✨ Petición Aprobada",
          "La petición ha sido aprobada exitosamente y está lista para ser enviada. La transferencia está resaltada en verde.",
          [{ text: "Entendido" }]
        );
      }, 500);
      // Quitar el resaltado después de 5 segundos
      setTimeout(() => {
        setHighlightedId(null);
      }, 5000);
    }
  }, [highlight]);

  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status || "all");
    setRefreshKey((prev) => prev + 1);
  };

  // Crear un adaptador de servicio para que funciona con AppList  
  const shipmentsService = React.useMemo(() => ({
    index: async (params: any) => {
      try {
        const response = await transferService.getShipments({
          ...params,
          company_id: company?.id,
        });
        
        // Filtrar por estado en el frontend si no es "all"
        let filteredData = response;
        if (selectedStatus !== "all") {
          filteredData = response.filter((item: any) => item.status === selectedStatus);
        }
        
        return { data: filteredData };
      } catch (error) {
        console.error('Error fetching shipments:', error);
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
    { value: "all", label: "Todos", color: "#6b7280", icon: "format-list-bulleted" },
    { value: "approved", label: "Listas para Envío", color: "#4CAF50", icon: "package-variant" },
    { value: "in_transit", label: "En Tránsito", color: "#FF9800", icon: "truck-delivery" },
    { value: "completed", label: "Entregadas", color: "#2196F3", icon: "check-all" },
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
      approved: { icon: "package-variant", color: "#4CAF50", label: "Lista para Envío" },
      in_transit: { icon: "truck-delivery", color: "#FF9800", label: "En Tránsito" },
      completed: { icon: "check-all", color: "#2196F3", label: "Entregada" },
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
        title="🚚 Envíos"
        service={shipmentsService as any}
        searchPlaceholder="Buscar envíos..."
        renderCard={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const isHighlighted = highlightedId === item.id;

          return {
            title: isHighlighted 
              ? `✨ #${item.transfer_number || item.id} (Recién Aprobada)` 
              : `#${item.transfer_number || item.id}`,
            subtitle: `🚚 Enviar a: ${item.to_location?.name || "N/A"} (desde ${item.from_location?.name || "N/A"})`,
            left: (
              <View style={styles.statusIconContainer}>
                <Icon
                  source={statusInfo.icon as any}
                  size={28}
                  color={isHighlighted ? "#4CAF50" : statusInfo.color}
                />
              </View>
            ),
            right: (
              <View style={styles.rightContent}>
                <Chip
                  style={[
                    styles.statusChip, 
                    { backgroundColor: (isHighlighted ? "#4CAF50" : statusInfo.color) + "20" }
                  ]}
                  textStyle={[
                    styles.statusText, 
                    { color: isHighlighted ? "#4CAF50" : statusInfo.color }
                  ]}
                  compact
                >
                  {isHighlighted ? "✨ " + statusInfo.label : statusInfo.label}
                </Chip>
                <Text style={styles.dateText}>
                  {item.status === 'approved' 
                    ? formatDate(item.approved_at || item.created_at || '')
                    : formatDate(item.shipped_at || item.created_at || '')}
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
          router.push(`/(tabs)/home/shipments/${item.id}` as any);
        }}
        filtersComponent={<StatusFilters />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  highlightedCard: {
    borderColor: "#4CAF50",
    borderWidth: 2,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
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