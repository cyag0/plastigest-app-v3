import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Button, TextInput, Card, Divider, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useAlerts } from "@/hooks/useAlerts";
import transferService, { ReceiptItem, Transfer } from "@/utils/services/transferService";

export default function ReceiveTransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alerts = useAlerts();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  const loadTransfer = async () => {
    try {
      console.log("Receive Screen - Loading transfer ID:", id);
      const data = await transferService.getById(Number(id));
      console.log("Receive Screen - Transfer loaded:", data);
      setTransfer(data);
      
      // Inicializar los receipts con las cantidades enviadas por defecto
      const initialReceipts: ReceiptItem[] = (data.details || []).map((detail) => ({
        transfer_detail_id: detail.id,
        product_id: detail.product_id,
        quantity_received: detail.quantity_shipped || detail.quantity_requested,
        unit_cost: detail.unit_cost,
        batch_number: "",
        expiry_date: "",
        notes: "",
      }));
      setReceipts(initialReceipts);
    } catch (error: any) {
      alerts.error(error.response?.data?.message || "Error al cargar transferencia");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateReceipt = (index: number, field: keyof ReceiptItem, value: any) => {
    const updated = [...receipts];
    updated[index] = { ...updated[index], [field]: value };
    setReceipts(updated);
  };

  const handleReceive = async () => {
    if (!transfer) return;

    // Validar que al menos un producto tenga cantidad > 0
    const hasProducts = receipts.some(r => r.quantity_received > 0);
    if (!hasProducts) {
      alerts.error("Debe recibir al menos un producto");
      return;
    }

    // Filtrar solo los productos con cantidad > 0
    const validReceipts = receipts.filter(r => r.quantity_received > 0);

    console.log("Recibiendo transferencia con receipts:", validReceipts);

    setProcessing(true);
    try {
      await transferService.receive(transfer.id, {
        receipts: validReceipts,
      });
      alerts.success("Transferencia recibida exitosamente");
      router.back();
    } catch (error: any) {
      console.error("Error al recibir transferencia:", error);
      console.error("Error response:", error.response?.data);
      alerts.error(error.response?.data?.message || error.message || "Error al recibir transferencia");
    } finally {
      setProcessing(false);
    }
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

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Confirmar Recepción
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            #{transfer.transfer_number}
          </Text>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>Origen:</Text>
            <Text variant="bodyMedium">{transfer.from_location.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>Destino:</Text>
            <Text variant="bodyMedium">{transfer.to_location.name}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Productos Recibidos
          </Text>
          <Text variant="bodySmall" style={styles.hint}>
            Confirme las cantidades recibidas
          </Text>
          <Divider style={styles.divider} />

          {receipts.map((receipt, index) => {
            const detail = (transfer.details || [])[index];
            if (!detail) return null;
            
            return (
              <View key={detail.id} style={styles.productCard}>
                <Text variant="titleSmall" style={styles.productName}>
                  {detail.product.name}
                </Text>
                <Text variant="bodySmall" style={styles.productCode}>
                  SKU: {detail.product.sku} | Código: {detail.product.code}
                </Text>
                
                <View style={styles.shippedRow}>
                  <Text variant="bodySmall" style={styles.shippedLabel}>
                    Cantidad enviada:
                  </Text>
                  <Text variant="bodyMedium" style={styles.shippedValue}>
                    {detail.quantity_shipped || detail.quantity_requested}
                  </Text>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text variant="bodySmall" style={styles.inputLabel}>
                      Cantidad Recibida *
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={String(receipt.quantity_received)}
                      onChangeText={(text) =>
                        updateReceipt(index, "quantity_received", parseFloat(text) || 0)
                      }
                      keyboardType="numeric"
                      style={styles.input}
                      dense
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text variant="bodySmall" style={styles.inputLabel}>
                      Costo Unitario
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={String(receipt.unit_cost)}
                      onChangeText={(text) =>
                        updateReceipt(index, "unit_cost", parseFloat(text) || 0)
                      }
                      keyboardType="numeric"
                      style={styles.input}
                      dense
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text variant="bodySmall" style={styles.inputLabel}>
                    Observaciones
                  </Text>
                  <TextInput
                    mode="outlined"
                    value={receipt.notes}
                    onChangeText={(text) =>
                      updateReceipt(index, "notes", text)
                    }
                    multiline
                    numberOfLines={2}
                    style={styles.input}
                    dense
                    placeholder="Estado del producto recibido, daños, etc."
                  />
                </View>

                {index < receipts.length - 1 && (
                  <Divider style={styles.productDivider} />
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
          disabled={processing}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleReceive}
          loading={processing}
          disabled={processing}
          style={styles.button}
        >
          Confirmar Recepción
        </Button>
      </View>
    </ScrollView>
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
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    fontWeight: "bold",
    width: 80,
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  hint: {
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  productCard: {
    marginBottom: 16,
  },
  productName: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  productCode: {
    color: "#666",
    marginBottom: 8,
  },
  shippedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#e3f2fd",
    padding: 8,
    borderRadius: 4,
  },
  shippedLabel: {
    fontWeight: "bold",
    marginRight: 8,
  },
  shippedValue: {
    fontWeight: "bold",
    color: "#1976d2",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    marginBottom: 4,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "white",
  },
  productDivider: {
    marginTop: 16,
    backgroundColor: "#ddd",
  },
  actions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  button: {
    flex: 1,
  },
});