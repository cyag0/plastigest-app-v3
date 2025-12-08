import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Card, Divider, ActivityIndicator, Chip, Button } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useAlerts } from "@/hooks/useAlerts";
import transferService, { Transfer } from "@/utils/services/transferService";
import palette from "@/constants/palette";
import AppBar from "@/components/App/AppBar";

export default function TransferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alerts = useAlerts();
  
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  const loadTransfer = async () => {
    try {
      const data = await transferService.getById(Number(id));
      setTransfer(data);
    } catch (error: any) {
      alerts.error(error.response?.data?.message || "Error al cargar transferencia");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!transfer) return;
    
    setProcessing(true);
    try {
      await transferService.approve(transfer.id);
      alerts.success("Transferencia aprobada exitosamente");
      loadTransfer();
    } catch (error: any) {
      alerts.error(error.response?.data?.message || "Error al aprobar transferencia");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!transfer) return;
    
    alerts.confirm({
      title: "Rechazar Transferencia",
      message: "¿Está seguro que desea rechazar esta transferencia?",
      onConfirm: async () => {
        setProcessing(true);
        try {
          await transferService.reject(transfer.id, "Rechazada por el usuario");
          alerts.success("Transferencia rechazada");
          router.back();
        } catch (error: any) {
          alerts.error(error.response?.data?.message || "Error al rechazar transferencia");
        } finally {
          setProcessing(false);
        }
      },
    });
  };

  const handleShip = () => {
    if (!transfer) return;
    router.push(`/(tabs)/home/transfers/ship/${transfer.id}` as any);
  };

  const handleReceive = () => {
    if (!transfer) return;
    router.push(`/(tabs)/home/transfers/receive/${transfer.id}` as any);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { color: string; label: string; bgColor: string }> = {
      pending: { color: "#FFA726", label: "Pendiente", bgColor: "#FFF3E0" },
      approved: { color: "#42A5F5", label: "Aprobada", bgColor: "#E3F2FD" },
      in_transit: { color: "#FFA726", label: "En Tránsito", bgColor: "#FFF3E0" },
      completed: { color: "#66BB6A", label: "Completada", bgColor: "#E8F5E9" },
      cancelled: { color: "#EF5350", label: "Cancelada", bgColor: "#FFEBEE" },
    };
    return statusMap[status] || { color: "#9E9E9E", label: "Desconocido", bgColor: "#F5F5F5" };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!transfer) {
    return (
      <View style={styles.centerContainer}>
        <Text>Transferencia no encontrada</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(transfer.status);

  return (
    <>
      <AppBar title="Detalle de Transferencia" goBack />
      <ScrollView style={styles.container}>
        {/* Header Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View style={styles.headerInfo}>
                <Text variant="headlineSmall" style={styles.transferNumber}>
                  #{transfer.transfer_number}
                </Text>
                <Text variant="bodyMedium" style={styles.transferDate}>
                  {formatDate(transfer.transfer_date)}
                </Text>
              </View>
              <Chip
                style={[styles.statusChip, { backgroundColor: statusInfo.bgColor }]}
                textStyle={{ color: statusInfo.color, fontWeight: "600" }}
              >
                {statusInfo.label}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Locations Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Ubicaciones
            </Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Origen:</Text>
              <Text style={styles.value}>{transfer.from_location?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Destino:</Text>
              <Text style={styles.value}>{transfer.to_location?.name || "N/A"}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Products Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Productos ({transfer.details?.length || 0})
            </Text>
            <Divider style={styles.divider} />

            {transfer.details?.map((detail, index) => (
              <View key={detail.id}>
                <View style={styles.productCard}>
                  <Text variant="titleSmall" style={styles.productName}>
                    {detail.product?.name || "N/A"}
                  </Text>
                  <Text variant="bodySmall" style={styles.productCode}>
                    SKU: {detail.product?.sku || "N/A"} | Código: {detail.product?.code || "N/A"}
                  </Text>
                  
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityItem}>
                      <Text variant="bodySmall" style={styles.quantityLabel}>Solicitado:</Text>
                      <Text variant="bodyMedium" style={styles.quantityValue}>
                        {detail.quantity_requested}
                      </Text>
                    </View>
                    
                    {detail.quantity_shipped !== null && (
                      <View style={styles.quantityItem}>
                        <Text variant="bodySmall" style={styles.quantityLabel}>Enviado:</Text>
                        <Text variant="bodyMedium" style={[styles.quantityValue, { color: "#1976d2" }]}>
                          {detail.quantity_shipped}
                        </Text>
                      </View>
                    )}
                    
                    {detail.quantity_received !== null && (
                      <View style={styles.quantityItem}>
                        <Text variant="bodySmall" style={styles.quantityLabel}>Recibido:</Text>
                        <Text variant="bodyMedium" style={[styles.quantityValue, { color: "#66BB6A" }]}>
                          {detail.quantity_received}
                        </Text>
                      </View>
                    )}
                  </View>

                  {detail.unit_cost && (
                    <Text variant="bodySmall" style={styles.unitCost}>
                      Costo unitario: ${parseFloat(detail.unit_cost).toFixed(2)}
                    </Text>
                  )}

                  {detail.notes && (
                    <Text variant="bodySmall" style={styles.notes}>
                      Notas: {detail.notes}
                    </Text>
                  )}
                </View>
                {index < (transfer.details?.length || 0) - 1 && (
                  <Divider style={styles.productDivider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Total Cost Card */}
        {transfer.total_cost && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.totalRow}>
                <Text variant="titleMedium">Total:</Text>
                <Text variant="headlineSmall" style={styles.totalAmount}>
                  ${parseFloat(transfer.total_cost).toFixed(2)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Comments Card */}
        {transfer.comments && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Comentarios
              </Text>
              <Divider style={styles.divider} />
              <Text style={styles.commentsText}>{transfer.comments}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {transfer.status === "pending" && (
            <>
              <Button
                mode="contained"
                onPress={handleApprove}
                loading={processing}
                disabled={processing}
                style={[styles.actionButton, { backgroundColor: "#66BB6A" }]}
              >
                Aprobar
              </Button>
              <Button
                mode="outlined"
                onPress={handleReject}
                disabled={processing}
                style={[styles.actionButton, { borderColor: "#EF5350" }]}
                textColor="#EF5350"
              >
                Rechazar
              </Button>
            </>
          )}

          {transfer.status === "approved" && (
            <Button
              mode="contained"
              onPress={handleShip}
              style={styles.actionButton}
            >
              Preparar Envío
            </Button>
          )}

          {transfer.status === "in_transit" && (
            <Button
              mode="contained"
              onPress={handleReceive}
              style={[styles.actionButton, { backgroundColor: "#66BB6A" }]}
            >
              Recibir Productos
            </Button>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerInfo: {
    flex: 1,
  },
  transferNumber: {
    fontWeight: "bold",
    color: palette.primary,
  },
  transferDate: {
    color: "#666",
    marginTop: 4,
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "transparent",
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.primary,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontWeight: "600",
    width: 100,
    color: "#666",
  },
  value: {
    flex: 1,
  },
  productCard: {
    marginBottom: 12,
  },
  productName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  productCode: {
    color: "#666",
    marginBottom: 8,
  },
  quantityRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  quantityItem: {
    flex: 1,
  },
  quantityLabel: {
    color: "#666",
    marginBottom: 2,
  },
  quantityValue: {
    fontWeight: "bold",
    fontSize: 16,
  },
  unitCost: {
    color: "#666",
    marginTop: 4,
  },
  notes: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    fontStyle: "italic",
    color: "#666",
  },
  productDivider: {
    marginVertical: 12,
    backgroundColor: "#ddd",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalAmount: {
    fontWeight: "bold",
    color: palette.primary,
  },
  commentsText: {
    color: "#666",
    fontStyle: "italic",
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
});
