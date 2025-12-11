import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

interface EditableDetail {
  id?: number;
  product_id: number;
  quantity_requested: number;
  notes?: string;
  product?: any;
  unit?: any;
}

export default function ReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alerts = useAlerts();
  const [transfer, setTransfer] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [editableDetails, setEditableDetails] = useState<EditableDetail[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (id) {
      loadTransfer();
    }
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const data = await Services.transfers.show(parseInt(id as string));
      const transferData = data.data.data;
      setTransfer(transferData as any);

      // Initialize editable details from petition details
      if (transferData.details) {
        const initialDetails: EditableDetail[] = transferData.details.map(
          (detail: any) => ({
            id: detail.id,
            product_id: detail.product_id,
            quantity_requested: parseFloat(detail.quantity_requested),
            notes: detail.notes,
            product: detail.product,
            unit: detail.unit,
          })
        );
        setEditableDetails(initialDetails);
      }
      setHasChanges(false);
    } catch (error) {
      console.error("Error loading transfer:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newDetails = [...editableDetails];
    newDetails[index].quantity_requested = numValue;
    setEditableDetails(newDetails);
    setHasChanges(true);
  };

  const removeDetail = async (index: number) => {
    const ok = await alerts.confirm(
      "¿Estás seguro de eliminar este producto de la petición?",
      { title: "Confirmar eliminación" }
    );
    if (ok) {
      const newDetails = editableDetails.filter((_, i) => i !== index);
      setEditableDetails(newDetails);
      setHasChanges(true);
    }
  };

  const handleConfirm = () => {
    if (!transfer) return;

    // Validate that there are products
    if (editableDetails.length === 0) {
      alerts.error("Debe haber al menos un producto en la petición");
      return;
    }

    // Validate quantities
    const invalidQuantities = editableDetails.some(
      (d) => d.quantity_requested <= 0
    );
    if (invalidQuantities) {
      alerts.error("Todas las cantidades deben ser mayores a 0");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const executeConfirm = async () => {
    if (!transfer) return;

    try {
      setIsProcessing(true);
      setShowConfirmModal(false);

      // If there are changes, update the details first
      if (hasChanges) {
        const updateData = {
          details: editableDetails.map((detail) => ({
            product_id: detail.product_id,
            quantity_requested: detail.quantity_requested,
            notes: detail.notes,
          })),
        };

        await transferService.update(transfer.id, updateData);
      }

      console.log("Updating transfer with data:", id);

      // Then approve the petition
      await transferService.ship(parseInt(id as string));

      alerts.success("Petición confirmada exitosamente");
      router.back();
    } catch (error) {
      console.error("Error confirming petition:", error);
      alerts.error("No se pudo confirmar la petición");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeReject = async () => {
    if (!transfer) return;

    if (!rejectionReason.trim()) {
      alerts.error("Debes proporcionar un motivo para el rechazo");
      return;
    }

    try {
      setIsProcessing(true);
      setShowRejectModal(false);

      await transferService.reject(transfer.id, rejectionReason);

      alerts.success("Petición rechazada exitosamente");
      router.back();
    } catch (error) {
      console.error("Error rejecting petition:", error);
      alerts.error("No se pudo rechazar la petición");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!transfer) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text>Transferencia no encontrada</Text>
        </View>
      </View>
    );
  }

  const getStatusInfo = (status: string) => {
    const statusMap: Record<
      string,
      { icon: string; color: string; label: string }
    > = {
      in_transit: {
        icon: "truck-fast",
        color: palette.info,
        label: "En Tránsito",
      },
      completed: {
        icon: "check-circle",
        color: palette.success,
        label: "Completada",
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
        label: "Desconocido",
      }
    );
  };

  const canDecide = transfer.status === "ordered";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header de la Transferencia */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text variant="headlineSmall">{transfer.transfer_number}</Text>
            </View>

            <View style={styles.transferInfo}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="store-outline"
                  size={20}
                  color={palette.primary}
                />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Origen</Text>
                  <Text style={styles.infoValue}>
                    {transfer.from_location?.name}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={palette.primary}
                />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Destino</Text>
                  <Text style={styles.infoValue}>
                    {transfer.to_location?.name}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color={palette.primary}
              />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Enviado</Text>
                <Text style={styles.infoValue}>
                  {transfer.shipped_at
                    ? new Date(transfer.shipped_at).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "N/A"}
                </Text>
              </View>
            </View>

            {transfer.received_at && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={palette.success}
                />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Recibido</Text>
                  <Text style={styles.infoValue}>
                    {new Date(transfer.received_at).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Productos Enviados/Para Recibir */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="package-variant"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Productos {canDecide ? "Para enviar" : "Enviados"}
              </Text>
            </View>
            {!canDecide && (
              <Text style={styles.subtitle}>
                Revisa las cantidades que fueron recibidas
              </Text>
            )}

            {editableDetails.map((detail, index) => {
              return (
                <View key={detail.id || index} style={styles.productItem}>
                  <View style={styles.productMainRow}>
                    {/* Product Image */}
                    <View style={styles.productImageContainer}>
                      {detail.product?.main_image?.uri ? (
                        <Image
                          source={{ uri: detail.product.main_image.uri }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <MaterialCommunityIcons
                            name="image-outline"
                            size={40}
                            color={palette.textSecondary}
                          />
                        </View>
                      )}
                    </View>

                    {/* Product Info */}
                    <View style={styles.productInfo}>
                      <Text variant="titleSmall" style={styles.productName}>
                        {detail.product?.name || "Producto desconocido"}
                      </Text>
                      <Text style={styles.productCode}>
                        SKU: {detail.product?.code || "N/A"}
                      </Text>

                      {canDecide ? (
                        <View style={styles.quantityEditRow}>
                          <MaterialCommunityIcons
                            name="package"
                            size={16}
                            color={palette.info}
                          />
                          <Text style={styles.quantityLabel}>Cantidad:</Text>
                          <TextInput
                            mode="outlined"
                            value={String(detail.quantity_requested)}
                            onChangeText={(value) =>
                              updateQuantity(index, value)
                            }
                            keyboardType="numeric"
                            style={styles.quantityInputSmall}
                            dense
                          />
                          <Text style={styles.unitText}>
                            {detail.product?.unit?.abbreviation ||
                              detail.unit?.abbreviation ||
                              "ud"}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.quantityRow}>
                          <MaterialCommunityIcons
                            name="package"
                            size={16}
                            color={palette.info}
                          />
                          <Text style={styles.quantityText}>
                            Solicitado: {detail.quantity_requested}{" "}
                            {detail.product?.unit?.abbreviation ||
                              detail.unit?.abbreviation ||
                              "ud"}
                          </Text>
                        </View>
                      )}

                      {detail.notes && (
                        <View style={styles.quantityRow}>
                          <MaterialCommunityIcons
                            name="note-text-outline"
                            size={16}
                            color={palette.textSecondary}
                          />
                          <Text style={styles.quantityText}>
                            {detail.notes}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Delete Button (only for ordered status) */}
                    {canDecide && (
                      <IconButton
                        icon="delete-outline"
                        iconColor={palette.error}
                        size={20}
                        onPress={() => removeDetail(index)}
                        style={styles.deleteButton}
                      />
                    )}
                  </View>

                  {index < editableDetails.length - 1 && (
                    <View style={styles.productDivider} />
                  )}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Notas Generales (solo si puede decidir) */}
        {canDecide && (
          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Notas Generales"
                value={generalNotes}
                onChangeText={setGeneralNotes}
                style={styles.input}
                placeholder="Observaciones generales..."
                multiline
                numberOfLines={3}
              />
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Botones de Acción */}
      {canDecide && (
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={handleReject}
            style={[styles.button, styles.rejectButton]}
            labelStyle={{ color: palette.red }}
            disabled={isProcessing}
          >
            Rechazar
          </Button>

          <Button
            mode="contained"
            onPress={handleConfirm}
            style={[styles.button, styles.confirmButton]}
            labelStyle={{ color: "white" }}
            disabled={loading || isProcessing}
            loading={isProcessing}
          >
            {isProcessing ? "Procesando..." : "Confirmar Envío"}
          </Button>
        </View>
      )}

      {/* Modal de Confirmación */}
      <Portal>
        <Modal
          visible={showConfirmModal}
          onDismiss={() => !isProcessing && setShowConfirmModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color={palette.success}
                />
                <Text variant="headlineSmall" style={styles.modalTitle}>
                  Confirmar Envío
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.modalText}>
                {hasChanges
                  ? "Se actualizarán las cantidades antes de confirmar el envío. ¿Deseas continuar?"
                  : "¿Confirmas que deseas proceder con este envío?"}
              </Text>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowConfirmModal(false)}
                  disabled={isProcessing}
                  style={[
                    {
                      flex: 1,
                    },
                    styles.cancelButton,
                  ]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={executeConfirm}
                  loading={isProcessing}
                  disabled={isProcessing}
                  style={[
                    {
                      flex: 1,
                    },
                    styles.confirmButton,
                  ]}
                >
                  {isProcessing ? "Procesando..." : "Confirmar"}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Modal de Rechazo */}
      <Portal>
        <Modal
          visible={showRejectModal}
          onDismiss={() => !isProcessing && setShowRejectModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content style={{ flex: 1 }}>
              <View style={{ flex: 1 }}>
                <View style={styles.modalTitleRow}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={32}
                    color={palette.error}
                  />
                  <Text variant="headlineSmall" style={styles.modalTitle}>
                    Rechazar Petición
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.modalText}>
                  Por favor indica el motivo del rechazo:
                </Text>

                <TextInput
                  label="Motivo del rechazo"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  style={styles.input}
                  placeholder="Explica por qué se rechaza la petición..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowRejectModal(false)}
                  disabled={isProcessing}
                  style={[
                    {
                      flex: 1,
                    },
                    styles.cancelButton,
                  ]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={executeReject}
                  loading={isProcessing}
                  disabled={isProcessing}
                  style={[
                    {
                      flex: 1,
                    },

                    { backgroundColor: palette.error },
                  ]}
                  labelStyle={{ color: "white" }}
                >
                  {isProcessing ? "Procesando..." : "Rechazar"}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    shadowColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  transferInfo: {
    gap: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: palette.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: palette.text,
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.primary,
  },
  subtitle: {
    fontSize: 13,
    color: palette.textSecondary,
    marginBottom: 16,
    fontStyle: "italic",
  },
  productItem: {
    marginBottom: 16,
  },
  productMainRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  productImageContainer: {
    width: 80,
    height: 80,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderStyle: "dashed",
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontWeight: "600",
    color: palette.text,
  },
  productCode: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantityText: {
    fontSize: 13,
    color: palette.text,
  },
  receiptControls: {
    gap: 12,
    marginTop: 8,
  },
  quantityInput: {
    backgroundColor: palette.background,
  },
  quantityEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quantityLabel: {
    fontSize: 13,
    color: palette.text,
  },
  quantityInputSmall: {
    width: 80,
    height: 36,
    backgroundColor: palette.surface,
  },
  unitText: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  deleteButton: {
    margin: 0,
  },
  differenceChip: {
    alignSelf: "flex-start",
    backgroundColor: palette.warning + "15",
  },
  differenceText: {
    color: palette.warning,
  },
  input: {
    backgroundColor: palette.background,
  },
  receivedInfo: {
    gap: 8,
    marginTop: 8,
  },
  damageReportContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: palette.warning + "15",
    padding: 8,
    borderRadius: 6,
  },
  damageReport: {
    flex: 1,
    fontSize: 13,
    color: palette.warning,
    fontStyle: "italic",
  },
  productDivider: {
    height: 1,
    backgroundColor: "#e9ecef",
    marginTop: 16,
  },
  actionButtons: {
    gap: 12,
    width: "100%",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#fff",
  },
  button: {
    //flex: 1,
  },
  cancelButton: {
    borderColor: palette.textSecondary,
  },
  rejectButton: {
    borderColor: palette.red,
  },
  confirmButton: {
    backgroundColor: palette.success,
  },
  modalContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    maxHeight: "60%",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: "bold",
  },
  modalText: {
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  locationCard: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  locationTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  infoText: {
    color: "#666",
    marginTop: 8,
  },
  productHeader: {
    marginBottom: 8,
  },

  quantityInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
});
