import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";

export default function PurchaseDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const purchaseId = params.id as string;

  const [purchase, setPurchase] = React.useState<App.Entities.Purchase | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);

  useAsync(async () => {
    try {
      const response = await Services.purchases.show(purchaseId);
      setPurchase(response.data);
    } catch (error) {
      console.error("Error loading purchase:", error);
      Alert.alert("Error", "No se pudo cargar la información de la compra");
    } finally {
      setLoading(false);
    }
  });

  const handleEdit = () => {
    router.push(`/(tabs)/home/purchases/${purchaseId}/edit` as any);
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirmar Eliminación",
      "¿Estás seguro de que deseas eliminar esta compra?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await Services.purchases.destroy(purchaseId);
              Alert.alert("Éxito", "Compra eliminada correctamente");
              router.back();
            } catch (error) {
              console.error("Error deleting purchase:", error);
              Alert.alert("Error", "No se pudo eliminar la compra");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!purchase) {
    return (
      <View style={styles.errorContainer}>
        <Text>No se encontró la compra</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header con información básica */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.purchaseNumber}>
                Compra #{purchase.purchase_number}
              </Text>
              <Text variant="bodyMedium" style={styles.purchaseDate}>
                {new Date(purchase.purchase_date).toLocaleDateString()}
              </Text>
            </View>
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    purchase.status === "open" ? "#FEF3C7" : "#D1FAE5",
                  borderColor:
                    purchase.status === "open" ? "#F59E0B" : "#10B981",
                },
              ]}
              textStyle={{
                color: purchase.status === "open" ? "#92400E" : "#065F46",
              }}
            >
              {purchase.status === "open" ? "ABIERTA" : "CERRADA"}
            </Chip>
          </View>

          <Text variant="titleLarge" style={styles.totalAmount}>
            ${parseFloat(purchase.total_amount?.toString() || "0").toFixed(2)}
          </Text>
        </Card.Content>
      </Card>

      {/* Información del proveedor */}
      {purchase.supplier_name && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Información del Proveedor
            </Text>
            <Divider style={{ marginVertical: 12 }} />

            <View style={styles.infoRow}>
              <Text style={styles.label}>Nombre:</Text>
              <Text style={styles.value}>{purchase.supplier_name}</Text>
            </View>

            {purchase.supplier_email && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{purchase.supplier_email}</Text>
              </View>
            )}

            {purchase.supplier_phone && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Teléfono:</Text>
                <Text style={styles.value}>{purchase.supplier_phone}</Text>
              </View>
            )}

            {purchase.supplier_address && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Dirección:</Text>
                <Text style={styles.value}>{purchase.supplier_address}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Información adicional */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Información General
          </Text>
          <Divider style={{ marginVertical: 12 }} />

          {purchase.location_name && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Ubicación:</Text>
              <Text style={styles.value}>{purchase.location_name}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Productos:</Text>
            <Text style={styles.value}>
              {purchase.details_count || 0} items
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Fecha de creación:</Text>
            <Text style={styles.value}>
              {new Date(purchase.created_at).toLocaleString()}
            </Text>
          </View>

          {purchase.comments && (
            <>
              <Text style={styles.label}>Comentarios:</Text>
              <Text style={styles.commentsValue}>{purchase.comments}</Text>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Botones de acción */}
      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={handleEdit}
          style={styles.editButton}
          icon="pencil"
        >
          Editar
        </Button>
        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.deleteButton}
          textColor={palette.error}
          icon="delete"
        >
          Eliminar
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  purchaseNumber: {
    fontWeight: "bold",
    color: palette.primary,
  },
  purchaseDate: {
    color: "#666",
    marginTop: 4,
  },
  statusChip: {
    borderWidth: 1,
  },
  totalAmount: {
    fontWeight: "bold",
    color: palette.primary,
    fontSize: 24,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.primary,
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
  commentsValue: {
    marginTop: 4,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    fontStyle: "italic",
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
    borderColor: palette.error,
  },
});
