import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

interface AdjustmentsIndexProps {
  route?: Href;
}

export default function AdjustmentsIndex(props: AdjustmentsIndexProps) {
  const router = useRouter();
  const { selectedLocation, isLoadingLocations } = useSelectedLocation();

  const route: Href = props.route || "/(tabs)/home/adjustment";

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
      filters={[
        {
          type: "simple",
          name: "movement_type",
          label: "Tipo",
          options: [
            { label: "Todos", value: "" },
            { label: "Entrada", value: "entry" },
            { label: "Salida", value: "exit" },
          ],
        },
        {
          type: "simple",
          name: "movement_reason",
          label: "Razón",
          options: [
            { label: "Todas", value: "" },
            { label: "Ajuste", value: "adjustment" },
            { label: "Retorno", value: "return" },
            { label: "Daño", value: "damage" },
            { label: "Pérdida", value: "loss" },
            { label: "Merma", value: "shrinkage" },
          ],
        },
      ]}
      onPressCreate={() => router.push(`${route}/form` as any)}
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
      onItemPress={(item) => router.push(`${route}/${item.id}` as any)}
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
