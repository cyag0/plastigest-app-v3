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
        const isIncrease = item.movement_type === "entry";

        // Mapeo de tipos de razón a etiquetas legibles
        const reasonLabels: Record<string, string> = {
          adjustment: "Ajuste",
          return: "Retorno",
          damage: "Daño",
          loss: "Pérdida",
          shrinkage: "Merma",
        };

        return {
          title: item.adjustment_number || `Ajuste #${item.id}`,
          description: (
            <>
              <AppList.Description>
                {(item.details?.length || 0) + " producto(s)"}
              </AppList.Description>
            </>
          ),
          right: (
            <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
              <MaterialCommunityIcons
                name={isIncrease ? "arrow-up-circle" : "arrow-down-circle"}
                size={32}
                color={isIncrease ? palette.success : palette.red}
              />
            </View>
          ),
          bottom: [
            {
              label: "Fecha",
              value: formatDate(item.movement_date) || "Sin fecha",
            },
            {
              label: "Acción",
              value:
                reasonLabels[item.movement_reason] ||
                item.movement_reason ||
                "Sin especificar",
            },
          ],
        };
      }}
      onItemPress={(item) => router.push(`/home/adjustment/${item.id}` as any)}
      searchPlaceholder="Buscar ajustes..."
      emptyMessage="No hay ajustes registrados"
      menu={{
        showView: true,
        showEdit: false,
        showDelete: false,
      }}
    />
  );
}

function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy} ${mm} ${dd}`;
}
