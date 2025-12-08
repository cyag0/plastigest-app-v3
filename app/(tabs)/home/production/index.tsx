import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Avatar } from "react-native-paper";

export default function ProductionIndex() {
  const router = useRouter();

  return (
    <>
      <AppList
        title="Producción"
        service={Services.productions}
        renderCard={({ item }: { item: any }) => ({
          title: `Producción #${item.production_number || item.id}`,
          description: (
            <AppList.Description
              numberOfLines={1}
              style={{ color: palette.textSecondary }}
            >
              {item.product_name || "Sin nombre"}
            </AppList.Description>
          ),
          left: (
            <View
              style={{
                justifyContent: "center",
                height: "100%",
                flex: 1,
              }}
            >
              {item.product_image ? (
                <Image
                  source={{ uri: item.product_image }}
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: "#ccc",
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: "#eee",
                  }}
                />
              ) : (
                <Avatar.Icon
                  size={50}
                  icon="factory"
                  style={{ backgroundColor: palette.primary }}
                  color={palette.background}
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
              <AppList.Title
                style={{
                  color: palette.primary,
                }}
              >
                {item.quantity} unidades
              </AppList.Title>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <AppList.Description
                  style={{
                    fontWeight: "bold",
                    color: palette.success,
                  }}
                >
                  Completado
                </AppList.Description>
              </View>
            </View>
          ),
          bottom: [
            {
              label: "Fecha",
              value: new Date(
                item.production_date || item.movement_date
              ).toLocaleDateString(),
            },
            {
              label: "Ubicación",
              value: item.location_name || "Sin ubicación",
            },
          ],
        })}
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/home/production/${entity.id}` as any);
        }}
        menu={{
          onEdit(item) {
            router.push(`/(tabs)/home/production/${item.id}/edit` as any);
          },
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/production/form" as any);
        }}
        fabLabel="Nueva Producción"
      />
    </>
  );
}

const styles = StyleSheet.create({});
