import AppList from "@/components/App/AppList/AppList";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Chip, Text } from "react-native-paper";

export default function ProductsIndex() {
  const router = useRouter();

  useAsync(async () => {
    console.log("Loading products...");

    const response = await Services.products.index({
      all: true,
    });

    console.log("Products loaded:", response.data);
  });

  return (
    <>
      <AppList
        title="Productos"
        service={Services.products}
        renderCard={({ item }: { item: any }) => ({
          title: item.name,
          description: (
            <View>
              <Text style={{ fontSize: 14, marginBottom: 4 }}>
                {item.description || "Sin descripción"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: "#666" }}>
                  Código: {item.code}
                </Text>
                <Text style={{ fontSize: 12, color: "#666" }}>
                  {item.company_name || "Sin empresa"}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  {item.sale_price && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "bold",
                        color: "#2e7d32",
                      }}
                    >
                      Venta: ${item.sale_price}
                    </Text>
                  )}
                  {item.purchase_price && (
                    <Text style={{ fontSize: 10, color: "#666" }}>
                      Compra: ${item.purchase_price}
                    </Text>
                  )}
                </View>
                <Chip
                  mode="flat"
                  style={{
                    backgroundColor: item.is_active ? "#e8f5e8" : "#fde8e8",
                    borderColor: item.is_active ? "#4caf50" : "#f44336",
                    borderWidth: 1,
                  }}
                  textStyle={{
                    color: item.is_active ? "#2e7d32" : "#c62828",
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                  compact
                >
                  {item.is_active ? "ACTIVO" : "INACTIVO"}
                </Chip>
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
