import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Text } from "react-native-paper";

// Helper function to get status configuration
const getStatusConfig = (status: string) => {
  switch (status) {
    case "draft":
      return {
        label: "BORRADOR",
        icon: "📝",
        backgroundColor: "#FEF3C7",
        borderColor: "#F59E0B",
        textColor: "#92400E",
      };
    case "ordered":
      return {
        label: "PEDIDO",
        icon: "📋",
        backgroundColor: "#DBEAFE",
        borderColor: "#3B82F6",
        textColor: "#1E40AF",
      };
    case "in_transit":
      return {
        label: "EN TRANSPORTE",
        icon: "🚚",
        backgroundColor: "#EDE9FE",
        borderColor: "#8B5CF6",
        textColor: "#5B21B6",
      };
    case "received":
      return {
        label: "RECIBIDO",
        icon: "📦",
        backgroundColor: "#D1FAE5",
        borderColor: "#10B981",
        textColor: "#065F46",
      };
    default:
      return {
        label: "DESCONOCIDO",
        icon: "❓",
        backgroundColor: "#F3F4F6",
        borderColor: "#9CA3AF",
        textColor: "#374151",
      };
  }
};

export default function PurchasesIndex() {
  const router = useRouter();

  useAsync(async () => {
    console.log("Loading purchases...");

    const response = await Services.purchases.index({
      all: true,
    });

    console.log("Purchases loaded:", response.data);
  });

  return (
    <>
      <AppList
        title="Compras"
        service={Services.purchases}
        renderCard={({ item }: { item: App.Entities.Purchase }) => {
          const statusConfig = getStatusConfig(item.status);

          return {
            title: (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text variant="titleMedium" style={{ color: palette.error }}>
                  Compra #{item.document_number || item.id}
                </Text>
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: statusConfig.backgroundColor,
                      borderColor: statusConfig.borderColor,
                    },
                  ]}
                  textStyle={[
                    styles.statusText,
                    {
                      color: statusConfig.textColor,
                    },
                  ]}
                  compact
                >
                  {statusConfig.label}
                </Chip>
              </View>
            ),
            description: (
              <>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {item.supplier_name
                    ? `Proveedor: ${item.supplier_name}`
                    : "Sin proveedor especificado"}
                </Text>
                {item.products_summary && (
                  <Text numberOfLines={1} style={{ marginTop: 4 }}>
                    Productos: {item.products_summary}
                  </Text>
                )}
                <View style={{ marginTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: palette.primary,
                    }}
                  >
                    $
                    {parseFloat(item.total_amount?.toString() || "0").toFixed(
                      2
                    )}
                  </Text>
                </View>
              </>
            ),
          };
        }}
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/home/purchases/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/purchases/form" as any);
        }}
        fabLabel="Nueva Compra"
      />
    </>
  );
}

const styles = StyleSheet.create({
  statusChip: {
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  locationText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  itemsText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    textAlign: "right",
  },
});
