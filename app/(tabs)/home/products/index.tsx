import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

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
          title: item.name,
          description: (
            <>
              <AppList.Description
                numberOfLines={1}
                style={{ color: palette.textSecondary }}
              >
                {item.description || "Sin descripción"}
              </AppList.Description>
            </>
          ),
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
                    width: 50,
                    height: 50,
                    backgroundColor: "#ccc",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#eee",
                  }}
                />
              )}
            </View>
          ),
          right: (
            <View
              style={{
                justifyContent: "flex-end",
                alignItems: "flex-end",
              }}
            >
              {item.sale_price && (
                <AppList.Title
                  style={{
                    color: palette.error,
                  }}
                >
                  {"$" + item.sale_price}
                </AppList.Title>
              )}

              {item.sale_price && (
                <AppList.Description
                  style={{
                    fontWeight: "bold",
                    color: item.is_active ? palette.success : palette.error,
                  }}
                >
                  {item.is_active ? "Activo" : "Inactivo"}
                </AppList.Description>
              )}
              {/* <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: item.is_active
                      ? palette.success + "20"
                      : palette.warning,
                    borderColor: item.is_active
                      ? palette.success
                      : palette.error,
                  },
                ]}
                textStyle={[
                  styles.statusText,
                  {
                    color: item.is_active ? palette.success : palette.error,
                  },
                ]}
                compact
              >
                {item.is_active ? "ACTIVO" : "INACTIVO"}
              </Chip> */}

              {/*  {item.current_stock !== null &&
                item.current_stock !== undefined && (
                  <View style={styles.stockInfo}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          item.current_stock <= (item.minimum_stock || 0)
                            ? palette.error
                            : palette.textSecondary,
                      }}
                    >
                      Stock: {item.current_stock}
                    </Text>
                    {item.current_stock <= (item.minimum_stock || 0) &&
                      item.minimum_stock > 0 && (
                        <Chip
                          mode="flat"
                          style={{
                            borderColor: palette.warning,
                            borderWidth: 1,
                            marginTop: 4,
                            backgroundColor: palette.background,
                          }}
                          textStyle={{
                            fontSize: 10,
                            color: palette.error,
                            fontWeight: "bold",
                          }}
                          compact
                        >
                          BAJO
                        </Chip>
                      )}
                  </View>
                )} */}
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
    minHeight: 100,
    gap: 8,
  },
  statusChip: {
    borderWidth: 1,
    height: 26,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  stockInfo: {
    alignItems: "flex-end",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "bold",
    color: palette.primary,
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  leftBottomInfo: {
    flex: 1,
  },
  rightBottomInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  stockText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  minStockText: {
    fontSize: 10,
    color: palette.textSecondary,
  },
  categoryText: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  companyText: {
    fontSize: 12,
    color: palette.textSecondary,
    marginTop: 2,
  },
});
