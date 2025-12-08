import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { Chip, Icon, IconButton, Text } from "react-native-paper";

export default function RecurringTasksIndexScreen() {
  const navigation = useRouter();
  const { location } = useAuth();

  if (!location) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <IconButton icon="alert-circle" size={64} iconColor={palette.warning} />
        <Text
          variant="titleLarge"
          style={{ fontWeight: "700", marginTop: 16, marginBottom: 8 }}
        >
          Sin Sucursal Seleccionada
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: palette.textSecondary, textAlign: "center" }}
        >
          Debes seleccionar una sucursal primero
        </Text>
      </View>
    );
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "inventory_count":
        return "clipboard-list";
      case "sales_report":
        return "chart-line";
      case "stock_check":
        return "package-variant";
      default:
        return "calendar-sync";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "inventory_count":
        return "Conteo de Inventario";
      case "sales_report":
        return "Reporte de Ventas";
      case "stock_check":
        return "Verificación de Stock";
      default:
        return type;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Diario";
      case "weekly":
        return "Semanal";
      case "monthly":
        return "Mensual";
      default:
        return frequency;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return palette.error;
      case "high":
        return palette.warning;
      case "medium":
        return palette.blue;
      case "low":
        return palette.success;
      default:
        return palette.textSecondary;
    }
  };

  return (
    <AppList
      title={`Tareas Recurrentes - ${location.name}`}
      service={Services.tasks}
      defaultFilters={{
        location_id: location.id,
        is_recurring: true,
      }}
      renderCard={({ item }) => ({
        title: item.title,
        description: item.description || "Sin descripción",
        left: (
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: palette.primary + "20",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name={getTypeIcon(item.type) as any}
              size={24}
              color={palette.primary}
            />
          </View>
        ),
        right: (
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Chip
              style={{
                backgroundColor: getPriorityColor(item.priority) + "20",
              }}
              textStyle={{
                color: getPriorityColor(item.priority),
                fontSize: 11,
                fontWeight: "600",
              }}
              compact
            >
              {item.priority?.toUpperCase() || "MEDIA"}
            </Chip>
          </View>
        ),
        bottomText: (
          <View style={{ gap: 6, marginTop: 6 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Icon source="tag" size={14} color={palette.primary} />
              <Text variant="bodySmall" style={{ color: palette.text }}>
                {getTypeLabel(item.type)}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Icon source="calendar-refresh" size={14} color={palette.blue} />
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary }}
              >
                {getFrequencyLabel(item.recurrence_frequency)}
                {item.recurrence_day && ` - Día ${item.recurrence_day}`}
                {item.recurrence_time && ` a las ${item.recurrence_time}`}
              </Text>
            </View>

            {item.next_occurrence && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Icon source="clock-outline" size={14} color={palette.info} />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  Próxima:{" "}
                  {new Date(item.next_occurrence).toLocaleDateString("es-PE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}

            {item.assigned_users && item.assigned_users.length > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Icon
                  source="account-multiple"
                  size={14}
                  color={palette.secondary}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  {item.assigned_users.length}{" "}
                  {item.assigned_users.length === 1
                    ? "usuario asignado"
                    : "usuarios asignados"}
                </Text>
              </View>
            )}
          </View>
        ),
      })}
      onItemPress={(entity) => {
        navigation.push(
          `/(tabs)/administration/recurring-tasks/${entity.id}` as any
        );
      }}
      onPressCreate={() => {
        navigation.push("/(tabs)/administration/recurring-tasks/form" as any);
      }}
      menu={{
        onEdit(item) {
          navigation.push(
            `/(tabs)/administration/recurring-tasks/${item.id}/edit` as any
          );
        },
      }}
      searchPlaceholder="Buscar tareas recurrentes..."
      emptyMessage={`No hay tareas recurrentes configuradas en ${location.name}`}
      createButtonText="Nueva Tarea Recurrente"
    />
  );
}
