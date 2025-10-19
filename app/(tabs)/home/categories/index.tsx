import AppList from "@/components/App/AppList/AppList";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Chip, Text } from "react-native-paper";

export default function CategoriesIndex() {
  const router = useRouter();

  useAsync(async () => {
    console.log("Loading categories...");

    const response = await Services.categories.index({
      all: true,
    });

    console.log("Categories loaded:", response.data);
  });

  return (
    <>
      <AppList
        title="Categorías"
        service={Services.categories}
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
                }}
              >
                <Text style={{ fontSize: 12, color: "#666" }}>
                  {item.company_name || "Sin empresa"}
                </Text>
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
                  {item.is_active ? "ACTIVA" : "INACTIVA"}
                </Chip>
              </View>
            </View>
          ),
        })}
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/home/categories/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/categories/form" as any);
        }}
        fabLabel="Nueva Categoría"
      />
    </>
  );
}
