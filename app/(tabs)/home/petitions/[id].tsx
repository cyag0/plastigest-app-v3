import AppBar from "@/components/App/AppBar";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  Modal,
  Portal,
  Text,
} from "react-native-paper";

export default function PetitionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const alerts = useAlerts();
  const [petition, setPetition] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (id) {
      loadPetition();
    }
  }, [id]);

  const loadPetition = async () => {
    try {
      setLoading(true);
      const data = await transferService.getTransfer(Number(id));
      setPetition(data);
    } catch (error) {
      console.error("Error loading petition:", error);
      alerts.error("No se pudo cargar la petición");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!petition) return;
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!petition) return;

    try {
      setApproving(true);
      setShowApprovalModal(false);

      await transferService.approve(petition.id);

      // Recargar los datos para ver el cambio
      await loadPetition();

      // Mostrar modal de éxito
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Error approving petition:", error);
      alerts.error("No se pudo aprobar la petición");
    } finally {
      setApproving(false);
    }
  };

  const goToShipments = () => {
    setShowSuccessModal(false);
    if (!petition) return;
    // Ir directamente a la preparación del envío
    router.replace(`/(tabs)/home/shipments/${petition.id}`);
  };

  const handleReceive = () => {
    if (!petition) return;
    setShowReceiveModal(true);
  };

  const confirmReceive = async () => {
    if (!petition) return;

    try {
      setReceiving(true);
      setShowReceiveModal(false);

      console.log("Receiving transfer with id:", id);

      // Llamar al servicio sin enviar datos - el backend procesa automáticamente
      await transferService.receive(parseInt(id as string));

      // Recargar los datos para ver el cambio
      await loadPetition();

      alerts.success("Productos recibidos exitosamente");
    } catch (error: any) {
      console.error("Error receiving products:", error);
      alerts.error("No se pudo confirmar la recepción");
    } finally {
      setReceiving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return palette.warning;
      case "approved":
        return palette.success;
      case "rejected":
        return palette.red;
      case "in_transit":
        return palette.blue;
      case "closed":
        return palette.success;
      default:
        return palette.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "approved":
        return "Aprobada";
      case "ordered":
        return "Ordenada";
      case "rejected":
        return "Rechazada";
      case "in_transit":
        return "En Tránsito";
      case "closed":
        return "Completada";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Cargando...</Text>
        </View>
      </View>
    );
  }

  if (!petition) {
    return (
      <View style={styles.container}>
        <AppBar title="Detalle de Petición" showBackButton />
        <View style={styles.loadingContainer}>
          <Text>No se encontró la petición</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text variant="headlineSmall">Petición #{petition.id}</Text>
              <Chip
                mode="flat"
                style={{ backgroundColor: getStatusColor(petition.status) }}
                textStyle={{ color: "white" }}
              >
                {getStatusLabel(petition.status)}
              </Chip>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={20}
                  color={palette.primary}
                  style={styles.infoIcon}
                />
                <Text variant="bodyMedium" style={styles.label}>
                  Sucursal que solicita:
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.infoText}>
                {petition.to_location?.name}
              </Text>
            </View>
            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="store"
                  size={20}
                  color={palette.primary}
                  style={styles.infoIcon}
                />
                <Text variant="bodyMedium" style={styles.label}>
                  Sucursal que enviará:
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.infoText}>
                {petition.from_location?.name}
              </Text>
            </View>
            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="account"
                  size={20}
                  color={palette.primary}
                  style={styles.infoIcon}
                />
                <Text variant="bodyMedium" style={styles.label}>
                  Solicitado por:
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.infoText}>
                {petition.requested_by_user?.name}
              </Text>
            </View>

            <View style={styles.infoColumn}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={palette.primary}
                  style={styles.infoIcon}
                />
                <Text variant="bodyMedium" style={styles.label}>
                  Fecha de solicitud:
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.infoText}>
                {formatDate(petition.created_at)}
              </Text>
            </View>

            {petition.approved_by_user && (
              <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color={palette.success}
                    style={styles.infoIcon}
                  />
                  <Text variant="bodyMedium" style={styles.label}>
                    Aprobado por:
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {petition.approved_by_user?.name}
                </Text>
              </View>
            )}

            {petition.approved_at && (
              <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="clock-check-outline"
                    size={20}
                    color={palette.success}
                    style={styles.infoIcon}
                  />
                  <Text variant="bodyMedium" style={styles.label}>
                    Fecha de aprobación:
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.infoText}>
                  {formatDate(petition.approved_at)}
                </Text>
              </View>
            )}

            {petition.rejection_reason && (
              <>
                <View style={styles.infoColumn}>
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={20}
                      color={palette.error}
                      style={styles.infoIcon}
                    />
                    <Text variant="bodyMedium" style={styles.label}>
                      Motivo del rechazo:
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.rejectionReason}>
                    {petition.rejection_reason}
                  </Text>
                </View>
              </>
            )}

            {petition.notes && (
              <>
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons
                    name="note-text"
                    size={20}
                    color={palette.primary}
                    style={styles.infoIcon}
                  />
                  <Text variant="bodyMedium" style={styles.label}>
                    Notas:
                  </Text>
                </View>
                <Text variant="bodyMedium" style={styles.notes}>
                  {petition.notes}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons
                name="package-variant"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Productos Solicitados
              </Text>
            </View>

            {petition.details && petition.details.length > 0 ? (
              petition.details.map((detail, index) => (
                <View key={index} style={styles.productItem}>
                  <Text variant="bodyLarge">{detail.product?.name}</Text>
                  <Text variant="bodyMedium" style={styles.productCode}>
                    Código: {detail.product?.code}
                  </Text>
                  <View style={styles.productInfo}>
                    <Text variant="bodyMedium" style={styles.quantity}>
                      Cantidad: {detail.quantity_requested}{" "}
                      {detail.product?.unit?.abbreviation ||
                        detail.unit?.abbreviation ||
                        "ud"}
                    </Text>
                  </View>

                  {detail.notes && (
                    <Text variant="bodySmall" style={styles.productNotes}>
                      Notas: {detail.notes || ""}
                    </Text>
                  )}

                  {index < (petition.details?.length || 0) - 1 && (
                    <Divider style={styles.productDivider} />
                  )}
                </View>
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.noData}>
                No hay productos en esta petición
              </Text>
            )}
          </Card.Content>
        </Card>

        {petition.status === "pending" && (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={handleApprove}
              style={[styles.button, styles.approveButton]}
              labelStyle={{ color: "white" }}
            >
              Aprobar Petición
            </Button>

            <Button
              mode="outlined"
              onPress={handleReject}
              style={[styles.button, styles.rejectButton]}
              labelStyle={{ color: "#F44336" }}
            >
              Rechazar Petición
            </Button>
          </View>
        )}
      </ScrollView>
      {petition.status === "in_transit" && (
        <View
          style={[
            styles.actionButtons,
            {
              paddingHorizontal: 16,
            },
          ]}
        >
          <Button
            mode="contained"
            onPress={handleReceive}
            loading={receiving}
            disabled={receiving}
            style={[styles.button, styles.receiveButton]}
            labelStyle={{ color: "white" }}
            icon="check-circle"
          >
            Confirmar Recepción de Productos
          </Button>
        </View>
      )}

      {/* Modal de Confirmación de Aprobación */}
      <Portal>
        <Modal
          visible={showApprovalModal}
          onDismiss={() => setShowApprovalModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Confirmar Aprobación
              </Text>
              <Text variant="bodyMedium" style={styles.modalText}>
                ¿Estás seguro de que quieres aprobar esta petición? Serás
                redirigido a Envíos para preparar el pedido.
              </Text>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowApprovalModal(false)}
                  style={[styles.button, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmApproval}
                  loading={approving}
                  disabled={approving}
                  style={[styles.button, styles.confirmButton]}
                >
                  Aprobar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Modal de Éxito */}
      <Portal>
        <Modal
          visible={showSuccessModal}
          onDismiss={() => setShowSuccessModal(false)}
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
                  ¡Éxito!
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.modalText}>
                Petición aprobada exitosamente. ¿Deseas ir a preparar el envío
                ahora?
              </Text>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowSuccessModal(false)}
                  style={[styles.button, styles.cancelButton]}
                >
                  Quedarme aquí
                </Button>
                <Button
                  mode="contained"
                  onPress={goToShipments}
                  style={[styles.button, styles.confirmButton]}
                >
                  Preparar Envío
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Modal de Confirmación de Recepción */}
      <Portal>
        <Modal
          visible={showReceiveModal}
          onDismiss={() => setShowReceiveModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color={palette.primary}
                />
                <Text variant="headlineSmall" style={styles.modalTitle}>
                  Confirmar Recepción
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.modalText}>
                ¿Confirmas que has recibido todos los productos de esta
                transferencia? Se incrementará el stock en tu ubicación.
              </Text>

              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowReceiveModal(false)}
                  style={[styles.button, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={confirmReceive}
                  loading={receiving}
                  disabled={receiving}
                  style={[styles.button, styles.confirmButton]}
                >
                  Confirmar Recepción
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
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
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
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoColumn: {
    flexDirection: "column",
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 8,
  },
  label: {
    fontWeight: "bold",
    minWidth: 140,
  },
  infoText: {
    flex: 1,
    color: palette.text,
    marginLeft: 28,
  },
  rejectionReason: {
    color: palette.error,
    marginTop: 4,
    fontStyle: "italic",
    marginLeft: 28,
  },
  notes: {
    color: palette.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
    marginLeft: 28,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.primary,
  },
  noData: {
    textAlign: "center",
    color: palette.textSecondary,
    fontStyle: "italic",
    paddingVertical: 20,
  },
  productItem: {
    paddingVertical: 8,
  },
  productCode: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  productInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  quantity: {
    color: palette.text,
    fontWeight: "500",
  },
  cost: {
    color: palette.success,
    fontWeight: "500",
  },
  productNotes: {
    color: palette.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  productDivider: {
    marginTop: 8,
  },
  totalContainer: {
    alignItems: "flex-end",
  },
  totalLabel: {
    fontWeight: "bold",
    color: palette.success,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: palette.success,
  },
  rejectButton: {
    borderColor: palette.error,
  },
  receiveButton: {
    backgroundColor: palette.primary,
  },
  modalContainer: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    textAlign: "center",
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
  cancelButton: {
    borderColor: palette.textSecondary,
  },
  confirmButton: {
    backgroundColor: palette.success,
  },
});
