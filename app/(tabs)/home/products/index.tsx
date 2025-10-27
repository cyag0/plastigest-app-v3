import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Chip, Text } from "react-native-paper";

export default function ProductsIndex() {
  const router = useRouter();

  const { selectedLocation, isLoadingLocations } = useSelectedLocation();

  if (isLoadingLocations) {
    return <Text>Cargando...</Text>;
  }

  return (
    <>
      <AppList
        title="Productos"
        service={Services.products}
        defaultFilters={{
          location_id: selectedLocation?.id,
        }}
        renderCard={({ item }: { item: any }) => ({
          title: (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppList.Title>{item.name}</AppList.Title>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: item.is_active
                      ? palette.background
                      : palette.error,
                    borderColor: item.is_active ? palette.primary : palette.red,
                  },
                ]}
                textStyle={[
                  styles.statusText,
                  {
                    color: item.is_active ? "#2e7d32" : "#c62828",
                  },
                ]}
                compact
              >
                {item.is_active ? "ACTIVO" : "INACTIVO"}
              </Chip>
            </View>
          ),
          description: (
            <>
              <AppList.Description numberOfLines={2}>
                {item.description || "Sin descripción"}
              </AppList.Description>
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  {item.sale_price && (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: palette.primary,
                      }}
                    >
                      ${item.sale_price}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  {item.current_stock !== null &&
                    item.current_stock !== undefined && (
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color:
                              item.current_stock <= (item.minimum_stock || 0)
                                ? "#c62828"
                                : "#666",
                          }}
                        >
                          Stock: {item.current_stock}
                        </Text>
                        {item.current_stock <= (item.minimum_stock || 0) &&
                          item.minimum_stock > 0 && (
                            <Chip
                              mode="flat"
                              style={{
                                backgroundColor: "#ffebee",
                                borderColor: "#c62828",
                                borderWidth: 1,
                                marginTop: 4,
                              }}
                              textStyle={{
                                fontSize: 10,
                                color: "#c62828",
                                fontWeight: "bold",
                              }}
                              compact
                            >
                              ⚠️ STOCK BAJO
                            </Chip>
                          )}
                      </View>
                    )}
                </View>
              </View>
            </>
          ),
          subtitle: `Código: ${item.code}`,
          /* image: item.main_image?.uri
            ? { uri: item.main_image.uri }
            : undefined, */
          left: (
            <View
              style={{
                justifyContent: "center",
                height: "100%",
                flex: 1,
              }}
            >
              {item.main_image?.uri && (
                <Image
                  source={{ uri: item.main_image.uri }}
                  style={{
                    width: 100,
                    height: 100,
                    backgroundColor: "#ccc",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#eee",
                  }}
                />
              )}
            </View>
          ),
          bottomContent: (
            <View style={styles.bottomContent}>
              <View style={styles.leftBottomInfo}>
                {item.category_name && (
                  <Text style={styles.categoryText}>
                    📁 {item.category_name}
                  </Text>
                )}
                {item.company_name && (
                  <Text style={styles.companyText}>🏢 {item.company_name}</Text>
                )}
              </View>
              <View style={styles.rightBottomInfo}>
                {item.current_stock !== null &&
                  item.current_stock !== undefined && (
                    <View style={styles.stockInfo}>
                      <Text style={styles.stockText}>
                        📦 {item.current_stock} unidades
                      </Text>
                      {item.minimum_stock > 0 && (
                        <Text style={styles.minStockText}>
                          Min: {item.minimum_stock}
                        </Text>
                      )}
                    </View>
                  )}
              </View>
            </View>
          ),
        })}
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/home/products/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/products/form" as any);
        }}
        fabLabel="Nuevo Producto"
      />
    </>
  );
}

const styles = StyleSheet.create({
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 60,
  },
  statusChip: {
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2e7d32",
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  leftBottomInfo: {
    flex: 1,
  },
  rightBottomInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  stockText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  minStockText: {
    fontSize: 10,
    color: "#999",
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
  },
  companyText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});
