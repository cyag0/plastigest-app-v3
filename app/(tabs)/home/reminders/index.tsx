import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList";
import PermissionGate from "@/components/App/PermissionGate";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { Text, Chip } from "react-native-paper";

export default function RemindersIndex() {
  const navigation = router;
  const alerts = useAlerts();
  const { hasPermission } = useAuth();
  // Cambia para recargar la lista (AppList no expone un refresh).
  const [refreshKey, setRefreshKey] = useState(0);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      payment: "cash-clock",
      renewal: "autorenew",
      expiration: "calendar-alert",
      other: "bell-ring",
    };
    return icons[type] || "bell";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      payment: palette.error,
      renewal: palette.blue,
      expiration: palette.warning,
      other: palette.textSecondary,
    };
    return colors[type] || palette.primary;
  };

  const getStatusColor = (reminder: App.Entities.Reminder) => {
    if (reminder.status === "completed") return palette.success;
    if (reminder.is_overdue) return palette.error;
    if (reminder.days_until_due != null && reminder.days_until_due <= 3) return palette.warning;
    return palette.textSecondary;
  };

  const getStatusLabel = (reminder: App.Entities.Reminder) => {
    if (reminder.status === "completed") return "Completado";
    if (reminder.is_overdue) return "Vencido";
    if (reminder.days_until_due != null) {
      if (reminder.days_until_due === 0) return "Hoy";
      if (reminder.days_until_due === 1) return "Mañana";
      if (reminder.days_until_due <= 7) return `En ${reminder.days_until_due} días`;
    }
    return "Pendiente";
  };

  

  return (
    <PermissionGate permission="reminders_list">
      <AppList
      key={refreshKey}
      title="Recordatorios"
      service={Services.reminders}
      // "+" pide reminders_create, abrir uno reminders_read (el formulario),
      // editar reminders_update y eliminar reminders_delete.
      permissionPrefix="reminders"
      filters={[
        {
          type: "simple",
          name: "status",
          label: "Estado",
          options: [
            { label: "Todos", value: "" },
            { label: "Pendientes", value: "pending" },
            { label: "Completados", value: "completed" },
          ],
        },
        {
          type: "simple",
          name: "type",
          label: "Tipo",
          options: [
            { label: "Todos", value: "" },
            { label: "Pagos", value: "payment" },
            { label: "Renovaciones", value: "renewal" },
            { label: "Vencimientos", value: "expiration" },
            { label: "Otros", value: "other" },
          ],
        },
        {
          // "date" → date_from/date_to, lo que filtra el backend ("date_range"
          // mandaba date_range_from/_to y no filtraba nada).
          type: "dateRange",
          name: "date",
          label: "Rango de Fechas",
          placeholder: "Seleccionar fechas",
        },
      ]}
      onPressCreate={
        hasPermission("reminders_create")
          ? () => {
              navigation.push("/home/reminders/form");
            }
          : undefined
      }
      onItemPress={(entity) => {
        navigation.push(`/home/reminders/form?id=${entity.id}`);
      }}
      renderCard={({ item: reminder }) => ({
        title: (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialCommunityIcons
              name={getTypeIcon(reminder.type)}
              size={20}
              color={getTypeColor(reminder.type)}
            />
            <Text variant="bodyLarge" style={{ fontWeight: "600", flex: 1 }}>
              {reminder.title}
            </Text>
          </View>
        ),
        description: (
          <View style={{ gap: 6, marginTop: 4 }}>
            {reminder.description && (
              <Text
                variant="bodyMedium"
                style={{ color: palette.text }}
                numberOfLines={2}
              >
                {reminder.description}
              </Text>
            )}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 4,
                flexWrap: "wrap",
              }}
            >
              <Chip
                mode="flat"
                compact
                style={{
                  backgroundColor: getStatusColor(reminder) + "20",
                }}
                textStyle={{
                  color: getStatusColor(reminder),
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {getStatusLabel(reminder)}
              </Chip>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={14}
                  color={palette.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  {formatDate(reminder.reminder_date)}
                </Text>
              </View>
              {reminder.amount && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={14}
                    color={palette.textSecondary}
                  />
                  <Text
                    variant="bodySmall"
                    style={{ color: palette.textSecondary, fontWeight: "600" }}
                  >
                    {new Intl.NumberFormat("es-MX", {
                      style: "currency",
                      currency: "MXN",
                    }).format(reminder.amount)}
                  </Text>
                </View>
              )}
              {reminder.is_recurring && (
                <MaterialCommunityIcons
                  name="refresh"
                  size={14}
                  color={palette.primary}
                />
              )}
            </View>
          </View>
        ),
        right: reminder.status !== "completed" && (
          <View style={{ justifyContent: "center" }}>
            <MaterialCommunityIcons
              name={reminder.is_overdue ? "alert-circle" : "clock-outline"}
              size={32}
              color={getStatusColor(reminder)}
            />
          </View>
        ),
      })}
      menu={{
        showView: false,
        showEdit: hasPermission("reminders_update"),
        showDelete: hasPermission("reminders_delete"),
        customActions: [
          {
            title: "Marcar como Completado",
            icon: "check-circle",
            color: palette.success,
            // También los vencidos (status "overdue"); pide reminders_update.
            show: (item: App.Entities.Reminder) =>
              item.status !== "completed" && hasPermission("reminders_update"),
            onPress: async (item: App.Entities.Reminder) => {
              try {
                await Services.reminders.markAsCompleted(item.id);
                alerts.success("Recordatorio completado");
                setRefreshKey((k) => k + 1);
              } catch (error: any) {
                console.error("Error al completar recordatorio:", error);
                const data = error?.response?.data;
                alerts.error(data?.message || data?.error || "No se pudo completar el recordatorio");
              }
            },
          },
        ],
      }}
      searchPlaceholder="Buscar recordatorios..."
      emptyMessage="No hay recordatorios registrados"
    />
    </PermissionGate>
  );
}
