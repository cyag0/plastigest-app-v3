import AppBar from "@/components/App/AppBar";
import palette from "@/constants/palette";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Divider, Text } from "react-native-paper";

export default function ShipmentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shipment, setShipment] = useState<InventoryTransfer | null>(null);
  const [loading, setLoading] = useState(true);

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
      loadShipment();
    }
  }, [id]);

  const loadShipment = async () => {
    try {
      setLoading(true);
      const data = await transferService.getTransfer(Number(id));
      setShipment(data);
    } catch (error) {
      console.error("Error loading shipment:", error);
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ordered":
        return palette.warning;
      case "in_transit":
        return palette.primary;
      case "closed":
        return palette.success;
      case "rejected":
        return palette.red;
      default:
        return palette.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ordered":
        return "Ordenada";
      case "in_transit":
        return "En Tránsito";
      case "closed":
        return "Completada";
      case "rejected":
        return "Rechazada";
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

  if (!shipment) {
    return (
      <View style={styles.container}>
        <AppBar title="Detalle de Envío" showBackButton />
        <View style={styles.loadingContainer}>
          <Text>No se encontró el envío</Text>
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
              <Text variant="headlineSmall">Envío #{shipment.id}</Text>
              <Chip
                mode="flat"
                style={{ backgroundColor: getStatusColor(shipment.status) }}
                textStyle={{ color: "white" }}
              >
                {getStatusLabel(shipment.status)}
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
                {shipment.to_location?.name}
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
                {shipment.from_location?.name}
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
                {shipment.requested_by_user?.name}
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
                {formatDate(shipment.created_at)}
              </Text>
            </View>

            {shipment.approved_by_user && (
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
                  {shipment.approved_by_user?.name}
                </Text>
              </View>
            )}

            {shipment.approved_at && (
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
                  {formatDate(shipment.approved_at)}
                </Text>
              </View>
            )}

            {shipment.rejection_reason && (
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
                  {shipment.rejection_reason}
                </Text>
              </View>
            )}

            {shipment.notes && (
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
                  {shipment.notes}
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
                Productos
              </Text>
            </View>

            {shipment.details && shipment.details.length > 0 ? (
              shipment.details.map((detail, index) => (
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

                  {index < (shipment.details?.length || 0) - 1 && (
                    <Divider style={styles.productDivider} />
                  )}
                </View>
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.noData}>
                No hay productos en este envío
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
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
  productNotes: {
    color: palette.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  productDivider: {
    marginTop: 8,
  },
});
