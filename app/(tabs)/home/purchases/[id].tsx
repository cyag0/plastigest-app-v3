import StatCard from "@/components/Dashboard/StatCard";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { Button, Divider, Text } from "react-native-paper";

interface PurchaseDetail {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  product_image?: any;
  package_id?: number;
  package_name?: string;
  quantity: number;
  quantity_received?: number;
  unit_id: number;
  unit_name: string;
  unit_abbreviation: string;
  unit_price: number;
  subtotal: number;
}

interface Purchase {
  id: number;
  document_number: string;
  purchase_number: string;
  status: string;
  supplier_name: string;
  purchase_date: string;
  total: number;
  notes?: string;
  details?: PurchaseDetail[];
  details_count?: number;
}

const statusSteps = [
  { key: "draft", label: "Borrador", icon: "file-document-edit-outline" },
  { key: "ordered", label: "Pedido", icon: "cart-check" },
  { key: "in_transit", label: "En Tránsito", icon: "truck-delivery" },
  { key: "received", label: "Recibido", icon: "package-variant-closed-check" },
  { key: "cancelled", label: "Cancelado", icon: "close-circle-outline" },
];

const getStatusIndex = (status: string) => {
  return statusSteps.findIndex((step) => step.key === status);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return palette.warning;
    case "ordered":
      return palette.blue;
    case "in_transit":
      return palette.accent;
    case "received":
      return palette.success;
    case "cancelled":
      return palette.error;
    default:
      return palette.textSecondary;
  }
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const alerts = useAlerts();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [receivingPurchase, setReceivingPurchase] = useState(false);

  useEffect(() => {
    loadPurchase();
  }, [id]);

  const loadPurchase = async () => {
    try {
      setLoading(true);
      const response = await Services.purchasesV2.show(Number(id));
      setPurchase(response.data.data);
    } catch (error) {
      console.error("Error loading purchase:", error);
      alerts.error("Error al cargar la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = async () => {
    try {
      const confirmed = await alerts.confirm(
        "¿Confirmar el pedido de compra?",
        {
          title: "Confirmar Pedido",
          okText: "Confirmar",
          cancelText: "Cancelar",
        },
      );

      if (!confirmed) return;

      setReceivingPurchase(true);
      const response = await Services.purchasesV2.confirm(Number(id));

      if (response.success) {
        alerts.success("Pedido confirmado exitosamente");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al confirmar el pedido");
      }
    } catch (error: any) {
      console.error("Error confirming order:", error);
      alerts.error(error.message || "Error al confirmar el pedido");
    } finally {
      setReceivingPurchase(false);
    }
  };

  const handleMarkInTransit = async () => {
    try {
      const confirmed = await alerts.confirm(
        "¿Marcar la compra como en tránsito?",
        {
          title: "En Tránsito",
          okText: "Confirmar",
          cancelText: "Cancelar",
        },
      );

      if (!confirmed) return;

      setReceivingPurchase(true);
      const response = await Services.purchasesV2.markInTransit(Number(id));

      if (response.success) {
        alerts.success("Compra marcada como en tránsito");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al actualizar el estado");
      }
    } catch (error: any) {
      console.error("Error marking in transit:", error);
      alerts.error(error.message || "Error al actualizar el estado");
    } finally {
      setReceivingPurchase(false);
    }
  };

  const handleReceivePurchase = async () => {
    try {
      if (!purchase?.details || purchase.details.length === 0) {
        alerts.error("No hay productos para recibir");
        return;
      }

      const confirmed = await alerts.confirm(
        "¿Confirmar que la compra ha sido recibida? Esto actualizará el stock de los productos. Esta acción no se puede deshacer.",
        {
          title: "Recibir Compra",
          okText: "Confirmar",
          cancelText: "Cancelar",
        },
      );

      if (!confirmed) return;

      setReceivingPurchase(true);

      // Crear detalles con las cantidades recibidas (por defecto, toda la cantidad pedida)
      const details = purchase.details.map((detail: PurchaseDetail) => ({
        id: detail.id,
        quantity_received: detail.quantity,
      }));

      const response = await Services.purchasesV2.receive(Number(id), details);

      if (response.success) {
        alerts.success(
          "Compra recibida exitosamente. El stock ha sido actualizado.",
        );
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al recibir la compra");
      }
    } catch (error: any) {
      console.error("Error receiving purchase:", error);
      alerts.error(error.message || "Error al recibir la compra");
    } finally {
      setReceivingPurchase(false);
    }
  };

  const handleCancelPurchase = async () => {
    try {
      const confirmed = await alerts.confirm(
        "¿Estás seguro de cancelar esta compra? Esta acción no se puede deshacer.",
        {
          title: "Cancelar Compra",
          okText: "Cancelar Compra",
          cancelText: "Volver",
        },
      );

      if (!confirmed) return;

      setReceivingPurchase(true);
      const response = await Services.purchasesV2.cancel(Number(id));

      if (response.success) {
        alerts.success("Compra cancelada exitosamente");
        await loadPurchase();
      } else {
        alerts.error(response.message || "Error al cancelar la compra");
      }
    } catch (error: any) {
      console.error("Error cancelling purchase:", error);
      alerts.error(error.message || "Error al cancelar la compra");
    } finally {
      setReceivingPurchase(false);
    }
  };

  const currentStatusIndex = purchase ? getStatusIndex(purchase.status) : -1;
  const statusColor = purchase
    ? getStatusColor(purchase.status)
    : palette.textSecondary;

  const renderHeader = () => {
    if (!purchase) return null;

    return (
      <View style={styles.section}>
        {/* Información General */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={40}
            color={palette.primary}
          />
          <View style={styles.headerText}>
            <Text variant="headlineMedium" style={styles.title}>
              Compra #{purchase.document_number || purchase.id}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {purchase.supplier_name || "Sin proveedor"}
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
            <StatCard
              icon="calendar-outline"
              value={new Date(purchase.purchase_date).toLocaleDateString(
                "es-PE",
                {
                  day: "2-digit",
                  month: "short",
                },
              )}
              label="Fecha"
              color={palette.blue}
            />
            <StatCard
              icon="cash"
              value={`$${parseFloat(purchase.total || "0").toFixed(2)}`}
              label="Total"
              color={palette.primary}
            />
          </View>
          <StatCard
            icon="package-variant"
            value={purchase.details_count || 0}
            label="Productos"
            color={palette.accent}
          />
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!purchase) return null;

    return (
      <>
        {/* Productos */}
        {purchase.details && purchase.details.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Productos ({purchase.details.length})
            </Text>
            {purchase.details.map((detail: PurchaseDetail, index: number) => (
              <View key={detail.id}>
                <View style={styles.productRow}>
                  {/* Imagen del producto */}
                  {detail.product_image ? (
                    <Image
                      source={{
                        uri:
                          typeof detail.product_image === "string"
                            ? detail.product_image
                            : detail.product_image.uri,
                      }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={24}
                        color={palette.textSecondary}
                      />
                    </View>
                  )}

                  <View style={styles.productInfo}>
                    <Text variant="bodyLarge" style={styles.productName}>
                      {detail.product_name}
                      {detail.package_name && (
                        <Text style={{ color: palette.textSecondary }}>
                          {" "}
                          - {detail.package_name}
                        </Text>
                      )}
                    </Text>
                    <Text variant="bodyMedium" style={styles.productCode}>
                      {detail.product_code}
                    </Text>
                    <Text variant="bodySmall" style={styles.productUnit}>
                      Unidad: {detail.unit_name} ({detail.unit_abbreviation})
                    </Text>
                    {purchase.status === "received" &&
                      detail.quantity_received && (
                        <Text
                          variant="bodySmall"
                          style={styles.receivedQuantity}
                        >
                          Recibido: {detail.quantity_received}{" "}
                          {detail.unit_abbreviation}
                        </Text>
                      )}
                  </View>
                  <View style={styles.productDetails}>
                    <Text variant="bodyMedium" style={styles.quantity}>
                      {detail.quantity} × $
                      {parseFloat(detail.unit_price || "0").toFixed(2)}
                    </Text>
                    <Text variant="titleMedium" style={styles.productTotal}>
                      ${parseFloat(detail.subtotal || "0").toFixed(2)}
                    </Text>
                  </View>
                </View>
                {index < purchase.details.length - 1 && (
                  <Divider style={styles.productDivider} />
                )}
              </View>
            ))}

            {/* Total */}
            <Divider style={styles.divider} />
            <View style={styles.totalRow}>
              <Text variant="titleLarge" style={styles.totalLabel}>
                Total
              </Text>
              <Text variant="headlineSmall" style={styles.totalValue}>
                ${parseFloat(purchase.total || "0").toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actions}>
          {purchase.status === "draft" && (
            <Button
              mode="contained"
              onPress={handleConfirmOrder}
              loading={receivingPurchase}
              disabled={receivingPurchase}
              icon="cart-check"
              buttonColor={palette.blue}
              style={styles.button}
            >
              Confirmar Pedido
            </Button>
          )}

          {purchase.status === "ordered" && (
            <Button
              mode="contained"
              onPress={handleMarkInTransit}
              loading={receivingPurchase}
              disabled={receivingPurchase}
              icon="truck-delivery"
              buttonColor={palette.accent}
              style={styles.button}
            >
              Marcar en Tránsito
            </Button>
          )}

          {purchase.status === "in_transit" && (
            <Button
              mode="contained"
              onPress={handleReceivePurchase}
              loading={receivingPurchase}
              disabled={receivingPurchase}
              icon="package-variant-closed-check"
              buttonColor={palette.success}
              style={styles.button}
            >
              Confirmar Recepción
            </Button>
          )}

          {purchase.status !== "received" &&
            purchase.status !== "cancelled" && (
              <Button
                mode="outlined"
                onPress={handleCancelPurchase}
                loading={receivingPurchase}
                disabled={receivingPurchase}
                icon="close-circle-outline"
                textColor={palette.error}
                style={[styles.button, { borderColor: palette.error }]}
              >
                Cancelar Compra
              </Button>
            )}

          {purchase.status === "received" && (
            <View style={styles.completedMessage}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={palette.success}
              />
              <Text
                variant="bodyLarge"
                style={{ color: palette.success, marginLeft: 8 }}
              >
                Compra completada
              </Text>
            </View>
          )}

          {purchase.status === "cancelled" && (
            <View style={styles.completedMessage}>
              <MaterialCommunityIcons
                name="close-circle"
                size={24}
                color={palette.error}
              />
              <Text
                variant="bodyLarge"
                style={{ color: palette.error, marginLeft: 8 }}
              >
                Compra cancelada
              </Text>
            </View>
          )}
        </View>
      </>
    );
  };

  const renderTimeline = () => {
    if (!purchase) return null;

    // Filtrar estados para no mostrar cancelled en el flujo normal
    const displaySteps =
      purchase.status === "cancelled"
        ? statusSteps.filter((step) => step.key === "cancelled")
        : statusSteps.filter((step) => step.key !== "cancelled");

    return (
      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Estado de la Compra
        </Text>
        {displaySteps.map((step, index) => {
          const isActive = step.key === purchase.status;
          const stepIndex = statusSteps.findIndex((s) => s.key === step.key);
          const isCompleted =
            stepIndex < currentStatusIndex && purchase.status !== "cancelled";
          const isLast = index === displaySteps.length - 1;
          const itemColor =
            isActive || isCompleted ? statusColor : palette.textSecondary;

          return (
            <View key={step.key} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: itemColor,
                      borderColor: itemColor,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={step.icon as any}
                    size={16}
                    color="#fff"
                  />
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineLine,
                      {
                        backgroundColor: isCompleted
                          ? statusColor
                          : palette.border,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.timelineTitle,
                    {
                      color:
                        isActive || isCompleted
                          ? palette.text
                          : palette.textSecondary,
                    },
                  ]}
                >
                  {step.label}
                </Text>
                <Text variant="bodySmall" style={styles.timelineSubtitle}>
                  {isActive
                    ? "Estado actual"
                    : isCompleted
                      ? "Completado"
                      : "Pendiente"}
                </Text>
              </View>
              {(isActive || isCompleted) && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={itemColor}
                  style={styles.timelineCheck}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { padding: 16 }]}>
        <Text>Cargando compra...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <FlatList
        data={[1]}
        renderItem={() => renderTimeline()}
        keyExtractor={(item) => item.toString()}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        style={styles.container}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  section: {
    padding: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    color: palette.text,
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  statsRow: {
    gap: 8,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: palette.textSecondary,
  },
  value: {
    color: palette.text,
    fontWeight: "600",
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    paddingBottom: 24,
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontWeight: "600",
  },
  timelineSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  timelineCheck: {
    marginTop: 4,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: palette.skeleton,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: palette.skeleton,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "600",
    color: palette.text,
  },
  productCode: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  productUnit: {
    color: palette.textSecondary,
    marginTop: 2,
    fontSize: 12,
  },
  receivedQuantity: {
    color: palette.success,
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  productDetails: {
    alignItems: "flex-end",
  },
  quantity: {
    color: palette.textSecondary,
  },
  productTotal: {
    fontWeight: "bold",
    color: palette.primary,
    marginTop: 4,
  },
  productDivider: {
    marginVertical: 4,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
  completedMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: palette.background,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
  },
  totalLabel: {
    fontWeight: "bold",
    color: palette.text,
  },
  totalValue: {
    fontWeight: "bold",
    color: palette.primary,
  },
});
