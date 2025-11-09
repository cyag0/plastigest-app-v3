import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function AdjustmentsIndex() {
  const router = useRouter();
  const { selectedLocation, isLoadingLocations } = useSelectedLocation();

  if (isLoadingLocations) {
    return <Text>Cargando...</Text>;
  }

  return (
    <AppList
      title="Ajustes de Inventario"
      service={Services.movements.adjustments}
      defaultFilters={{
        location_id: selectedLocation?.id,
      }}
      onPressCreate={() => router.push("/home/adjustment/form")}
      renderCard={({ item }: { item: Adjustment }) => {
        const isIncrease = item.adjustment_type === "increase";

        return {
          title: (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", color: palette.textSecondary }}
              >
                {item.adjustment_number}
              </Text>
              <MaterialCommunityIcons
                name={isIncrease ? "arrow-up-circle" : "arrow-down-circle"}
                size={18}
                color={isIncrease ? palette.success : palette.error}
              />
            </View>
          ),
          description: (
            <>
              <AppList.Description>
                {item.adjustment_date} • {item.reason || "Sin motivo"}
              </AppList.Description>
              {item.location && (
                <AppList.Description>
                  📍 {item.location.name}
                </AppList.Description>
              )}
            </>
          ),
          right: (
            <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
              <AppList.Title
                style={{
                  color: isIncrease ? palette.success : palette.error,
                }}
              >
                {isIncrease ? "+" : "-"}${item.total_cost?.toFixed(2) || "0.00"}
              </AppList.Title>
              <AppList.Description>
                {item.details?.length || 0} producto(s)
              </AppList.Description>
            </View>
          ),
          bottom: [
            {
              label: "Tipo",
              value: isIncrease ? "Incremento" : "Decremento",
            },
            ...(item.adjusted_by
              ? [{ label: "Ajustado por", value: item.adjusted_by }]
              : []),
          ],
        };
      }}
      detailRoute={(item) => `/home/adjustment/${item.id}`}
      searchPlaceholder="Buscar ajustes..."
      emptyMessage="No hay ajustes registrados"
    />
  );
}
