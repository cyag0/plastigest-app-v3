import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Text,
  TextInput,
  Switch,
  Chip,
} from "react-native-paper";
import palette from "@/constants/palette";
import AppSelect from "@/components/Form/AppSelect";
import { DatePickerInput } from "react-native-paper-dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ReminderFormProps {
  id?: number;
}

export default function ReminderForm(props: ReminderFormProps) {
  const params = useLocalSearchParams();
  const reminderId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const alerts = useAlerts();

  const { location } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [reminderDate, setReminderDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("monthly");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState("1");
  const [assignedUserId, setAssignedUserId] = useState<string>("");

  const [types, setTypes] = useState<Array<{ label: string; value: string }>>(
    []
  );
  const [recurrenceTypes, setRecurrenceTypes] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [users, setUsers] = useState<Array<{ label: string; value: string }>>(
    []
  );

  useEffect(() => {
    loadTypes();
    loadUsers();
    if (reminderId) {
      loadReminder();
    }
  }, [reminderId]);

  const loadTypes = async () => {
    try {
      const [typesRes, recurrenceRes] = await Promise.all([
        Services.reminders.getTypes(),
        Services.reminders.getRecurrenceTypes(),
      ]);

      setTypes(
        Object.entries(typesRes.data).map(([value, label]) => ({
          label: label as string,
          value,
        }))
      );

      setRecurrenceTypes(
        Object.entries(recurrenceRes.data).map(([value, label]) => ({
          label: label as string,
          value,
        }))
      );
    } catch (error) {
      console.error("Error loading types:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await Services.reminders.getUsers();
      console.log("Users response:", response);
      
      // La respuesta puede venir en response.data.data o response.data
      const usersData = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || [];
      
      console.log("Users data:", usersData);
      
      setUsers(
        usersData.map((user: any) => ({
          label: user.name,
          value: user.id.toString(),
        }))
      );
    } catch (error) {
      console.error("Error loading users:", error);
      alerts.error("Error al cargar usuarios");
    }
  };

  const loadReminder = async () => {
    if (!reminderId) return;

    try {
      setLoading(true);
      const response = await Services.reminders.show(reminderId);
      const reminder = response.data;

      setTitle(reminder.title);
      setDescription(reminder.description || "");
      setType(reminder.type);
      setReminderDate(new Date(reminder.reminder_date + "T00:00:00"));
      setAmount(reminder.amount?.toString() || "");
      setIsRecurring(reminder.is_recurring);
      setRecurrenceType(reminder.recurrence_type || "monthly");
      setRecurrenceInterval(reminder.recurrence_interval?.toString() || "1");
      setNotifyEnabled(reminder.notify_enabled);
      setNotifyDaysBefore(reminder.notify_days_before.toString());
      setAssignedUserId(reminder.user_id?.toString() || "");
    } catch (error) {
      console.error("Error loading reminder:", error);
      alerts.error("Error al cargar el recordatorio");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validations
    if (!title.trim()) {
      alerts.error("Ingresa un título");
      return;
    }
    if (!type) {
      alerts.error("Selecciona un tipo");
      return;
    }

    try {
      setSaving(true);

      const data: any = {
        title,
        type,
        reminder_date: new Date(
          reminderDate.getTime() - reminderDate.getTimezoneOffset() * 60000
        )
          .toISOString()
          .split("T")[0],
        is_recurring: isRecurring === true ? 1 : 0,
        notify_enabled: notifyEnabled === true ? 1 : 0,
        notify_days_before: parseInt(notifyDaysBefore) || 1,
      };

      // Solo agregar campos opcionales si tienen valor
      if (assignedUserId && assignedUserId.trim()) {
        data.user_id = parseInt(assignedUserId);
      }

      if (description && description.trim()) {
        data.description = description;
      }

      if (amount && parseFloat(amount) > 0) {
        data.amount = parseFloat(amount);
      }

      if (isRecurring && recurrenceType) {
        data.recurrence_type = recurrenceType;
        data.recurrence_interval = parseInt(recurrenceInterval) || 1;
      }

      console.log('Datos a enviar:', data);

      if (reminderId) {
        await Services.reminders.update(reminderId, data);
        alerts.success("Recordatorio actualizado correctamente");
      } else {
        await Services.reminders.store(data);
        alerts.success("Recordatorio creado correctamente");
      }

      router.back();
    } catch (error: any) {
      console.error("Error saving reminder:", error);
      console.error("Error response:", error.response?.data);
      console.error("Validation errors:", error.response?.data?.errors);
      
      // Mostrar errores de validación específicos
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors)
          .map(([field, messages]: [string, any]) => {
            return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
          })
          .join('\n');
        alerts.error(`Errores de validación:\n${errorMessages}`);
      } else {
        const errorMessage = error.response?.data?.message || 
                            "Error al guardar el recordatorio";
        alerts.error(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 16 }}>Cargando recordatorio...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            {/* Tipo */}
            <View style={styles.input}>
              <AppSelect
                value={type}
                onChange={setType}
                data={types}
                placeholder="Selecciona un tipo"
                label="Tipo de Recordatorio"
              />
            </View>

            {/* Usuario asignado */}
            <View style={styles.input}>
              <AppSelect
                value={assignedUserId}
                onChange={setAssignedUserId}
                data={users}
                placeholder="Selecciona un usuario"
                label="Asignar a"
              />
              <Text variant="bodySmall" style={{ color: palette.textSecondary, marginTop: 4 }}>
                El recordatorio solo será visible para el usuario seleccionado
              </Text>
            </View>

            {/* Título */}
            <TextInput
              label="Título"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="text" />}
              placeholder="Ej: Pago de renta mensual"
            />

            {/* Descripción */}
            <TextInput
              label="Descripción (Opcional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              mode="outlined"
              style={styles.input}
              placeholder="Detalles adicionales..."
            />

            {/* Fecha */}
            <DatePickerInput
              locale="es"
              label="Fecha del Recordatorio"
              value={reminderDate}
              onChange={(date) => date && setReminderDate(date)}
              inputMode="start"
              mode="outlined"
              style={styles.input}
            />

            {/* Monto (opcional) */}
            {(type === "payment" || type === "renewal") && (
              <TextInput
                label="Monto (Opcional)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />
            )}
          </Card.Content>
        </Card>

        {/* Recurrencia */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="refresh"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Recurrencia
              </Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge">Recordatorio Recurrente</Text>
                <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                  Se creará automáticamente el siguiente
                </Text>
              </View>
              <Switch value={isRecurring} onValueChange={setIsRecurring} />
            </View>

            {isRecurring && (
              <>
                <View style={styles.input}>
                  <AppSelect
                    value={recurrenceType}
                    onChange={setRecurrenceType}
                    data={recurrenceTypes}
                    placeholder="Selecciona frecuencia"
                    label="Frecuencia"
                  />
                </View>

                <TextInput
                  label="Cada cuántos"
                  value={recurrenceInterval}
                  onChangeText={setRecurrenceInterval}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="numeric" />}
                  helperText={`Se repetirá cada ${recurrenceInterval} ${
                    recurrenceTypes.find((r) => r.value === recurrenceType)
                      ?.label || "período"
                  }`}
                />
              </>
            )}
          </Card.Content>
        </Card>

        {/* Notificaciones */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="bell-ring"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notificaciones
              </Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge">Activar Notificaciones</Text>
                <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                  Recibe alertas antes de la fecha
                </Text>
              </View>
              <Switch value={notifyEnabled} onValueChange={setNotifyEnabled} />
            </View>

            {notifyEnabled && (
              <TextInput
                label="Notificar días antes"
                value={notifyDaysBefore}
                onChangeText={setNotifyDaysBefore}
                keyboardType="number-pad"
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="calendar-alert" />}
                helperText={`Recibirás una notificación ${notifyDaysBefore} días antes`}
              />
            )}
          </Card.Content>
        </Card>

        {location && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.infoSection}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={16}
                  color={palette.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  Ubicación: {location.name}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.button}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            loading={saving}
            disabled={saving}
            buttonColor={palette.primary}
          >
            {reminderId ? "Actualizar" : "Guardar"}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  card: {
    backgroundColor: palette.surface,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: palette.surface,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: palette.background,
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  button: {
    flex: 1,
  },
});
