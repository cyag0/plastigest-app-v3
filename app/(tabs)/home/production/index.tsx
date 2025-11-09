import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Avatar, Chip, Text } from "react-native-paper";

export default function ProductionIndex() {
  const router = useRouter();

  return (
    <>
      <AppList
        title="Producción"
        service={Services.productions}
        renderCard={({ item }: { item: any }) => ({
          left: (
            <View style={styles.leftContent}>
              {item.product_image ? (
                <Image
                  source={{ uri: item.product_image }}
                  style={{
                    backgroundColor: palette.surface,
                    width: 100,
                    height: 100,
                    borderRadius: 12,
                  }}
                />
              ) : (
                <Avatar.Icon
                  size={56}
                  icon="package-variant-closed"
                  style={{ backgroundColor: palette.primary }}
                  color={palette.background}
                />
              )}
            </View>
          ),
          title: (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <MaterialCommunityIcons
                  name="factory"
                  size={18}
                  color={palette.primary}
                  style={{ marginRight: 6 }}
                />
                <Text variant="titleMedium" style={{ color: palette.text }}>
                  Producción #{item.production_number || item.id}
                </Text>
              </View>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: palette.success + "20",
                    borderColor: palette.success,
                  },
                ]}
                textStyle={[
                  styles.statusText,
                  {
                    color: palette.success,
                  },
                ]}
                compact
                icon={() => (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={14}
                    color={palette.success}
                  />
                )}
              >
                COMPLETADO
              </Chip>
            </View>
          ),
          description: (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={14}
                  color={palette.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
                  {new Date(
                    item.production_date || item.movement_date
                  ).toLocaleDateString()}
                </Text>
              </View>
              <AppList.Description
                numberOfLines={2}
                style={{ color: palette.textSecondary }}
              >
                {item.product_name || "Sin nombre"}
              </AppList.Description>
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="package-variant"
                  size={16}
                  color={palette.primary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: palette.primary,
                  }}
                >
                  {item.quantity} unidades producidas
                </Text>
              </View>

              <View style={styles.bottomContent}>
                {item.location_name && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="map-marker"
                      size={14}
                      color={palette.accent}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.locationText}>
                      {item.location_name}
                    </Text>
                  </View>
                )}
                {item.product_code && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      justifyContent: "flex-end",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="barcode"
                      size={14}
                      color={palette.accent}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.itemsText}>{item.product_code}</Text>
                  </View>
                )}
              </View>
            </>
          ),
        })}
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/home/production/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/home/production/form" as any);
        }}
        fabLabel="Nueva Producción"
      />
    </>
  );
}

const styles = StyleSheet.create({
  leftContent: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusChip: {
    borderWidth: 1,
    height: 26,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  locationText: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  itemsText: {
    fontSize: 12,
    color: palette.textSecondary,
    textAlign: "right",
  },
});
