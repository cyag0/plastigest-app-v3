import StatCard from "@/components/Dashboard/StatCard";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, View } from "react-native";
import { Button, Divider, Text } from "react-native-paper";

interface Purchase {
  id: number;
  document_number: string;
  status: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  cart_items?: any[];
  details_count?: number;
}

const statusSteps = [
  { key: "draft", label: "Borrador", icon: "file-document-edit-outline" },
  { key: "ordered", label: "Pedido", icon: "cart-check" },
  { key: "in_transit", label: "En Tránsito", icon: "truck-delivery" },
  { key: "received", label: "Recibido", icon: "package-variant-closed-check" },
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
      const response = await Services.purchases.show(Number(id));
      setPurchase(response.data.data);
    } catch (error) {
      console.error("Error loading purchase:", error);
      alerts.error("Error al cargar la compra");
    } finally {
      setLoading(false);
    }
  };

  const handleReceivePurchase = async () => {
    try {
      const confirmed = await alerts.confirm(
        "¿Confirmar que la compra ha sido recibida? Esto actualizará el stock de los productos.",
        {
          title: "Recibir Compra",
          okText: "Confirmar",
          cancelText: "Cancelar",
        }
      );

      if (!confirmed) return;

      setReceivingPurchase(true);
      const response = await Services.purchases.receivePurchase(Number(id));

      if (response.success) {
        alerts.success(
          "Compra recibida exitosamente. El stock ha sido actualizado."
        );
        await loadPurchase(); // Recargar datos
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
                }
              )}
              label="Fecha"
              color={palette.blue}
            />
            <StatCard
              icon="cash"
              value={`$${purchase.total_amount?.toFixed(2) || "0.00"}`}
              label="Total"
              color={palette.primary}
            />
          </View>
          <StatCard
            icon="package-variant"
            value={
              (purchase.cart_items || [])?.length || purchase.details_count || 0
            }
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
        {purchase.cart_items && (purchase.cart_items || []).length > 0 && (
          <View style={styles.section}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Productos
            </Text>
            {purchase.cart_items.map((item: any, index: number) => (
              <View key={index}>
                <View style={styles.productRow}>
                  {/* Imagen del producto */}
                  {item.main_image?.uri ? (
                    <Image
                      source={{ uri: item.main_image.uri }}
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
                      {item.name}
                    </Text>
                    <Text variant="bodyMedium" style={styles.productCode}>
                      {item.code}
                    </Text>
                    {item.unit_name && (
                      <Text variant="bodySmall" style={styles.productUnit}>
                        Unidad: {item.unit_name} ({item.unit_abbreviation})
                      </Text>
                    )}
                  </View>
                  <View style={styles.productDetails}>
                    <Text variant="bodyMedium" style={styles.quantity}>
                      {item.quantity} × ${item.unit_price?.toFixed(2)}
                    </Text>
                    <Text variant="titleMedium" style={styles.productTotal}>
                      ${item.total?.toFixed(2)}
                    </Text>
                  </View>
                </View>
                {index < (purchase.cart_items || []).length - 1 && (
                  <Divider style={styles.productDivider} />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Acciones */}
        <View style={styles.actions}>
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

          {purchase.status === "draft" && (
            <Button
              mode="contained"
              onPress={() =>
                router.push(
                  `/(tabs)/home/purchases/formv2?id=${purchase.id}` as any
                )
              }
              icon="pencil"
              buttonColor={palette.primary}
              style={styles.button}
            >
              Editar Compra
            </Button>
          )}
        </View>
      </>
    );
  };

  const renderTimeline = () => {
    if (!purchase) return null;

    return (
      <View style={styles.section}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          Estado de la Compra
        </Text>
        {statusSteps.map((step, index) => {
          const isActive = index === currentStatusIndex;
          const isCompleted = index < currentStatusIndex;
          const isLast = index === statusSteps.length - 1;
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
});
