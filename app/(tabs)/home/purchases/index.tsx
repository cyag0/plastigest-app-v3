import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Text } from "react-native-paper";

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
        renderCard={({ item }: { item: App.Entities.Purchase }) => ({
          title: (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppList.Title>Compra #{item.purchase_number}</AppList.Title>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  {
                    backgroundColor:
                      item.status === "open" ? "#FEF3C7" : "#D1FAE5",
                    borderColor: item.status === "open" ? "#F59E0B" : "#10B981",
                  },
                ]}
                textStyle={[
                  styles.statusText,
                  {
                    color: item.status === "open" ? "#92400E" : "#065F46",
                  },
                ]}
                compact
              >
                {item.status === "open" ? "ABIERTA" : "CERRADA"}
              </Chip>
            </View>
          ),
          description: (
            <>
              <AppList.Description numberOfLines={2}>
                {item.supplier_name
                  ? `Proveedor: ${item.supplier_name}`
                  : "Sin proveedor especificado"}
              </AppList.Description>
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: palette.primary,
                  }}
                >
                  ${parseFloat(item.total_amount?.toString() || "0").toFixed(2)}
                </Text>
              </View>
            </>
          ),
          subtitle: `Fecha: ${new Date(
            item.purchase_date
          ).toLocaleDateString()}`,
          bottomContent: (
            <View style={styles.bottomContent}>
              {item.location_name && (
                <Text style={styles.locationText}>📍 {item.location_name}</Text>
              )}
              {item.details_count !== undefined && (
                <Text style={styles.itemsText}>
                  📦 {item.details_count} productos
                </Text>
              )}
            </View>
          ),
        })}
        onItemPress={(entity: App.Entities.Purchase) => {
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
