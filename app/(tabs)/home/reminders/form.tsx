import { toLocalDateString } from "@/utils/dates";
import { parseMoney } from "@/utils/format";
import { goBack } from "@/utils/navigation";
import AppSelect from "@/components/Form/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Switch,
  Text,
  TextInput,
  HelperText,
} from "react-native-paper";
import { DatePickerInput } from "react-native-paper-dates";

interface ReminderFormProps {
  id?: number;
}

export default function ReminderForm(props: ReminderFormProps) {
  const params = useLocalSearchParams();
  const reminderId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const alerts = useAlerts();

  const { location, user: me } = useAuth();
  // Abrir uno existente pide reminders_read (guard de rutas); guardarlo,
  // reminders_update. Sin él el formulario queda de solo lectura.
  const { canUpdate } = useCan();
  const readOnly = !!reminderId && !canUpdate("reminders");
  const { colors } = useTheme();

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
  // Un recordatorio siempre es de alguien (solo lo ve esa persona): por
  // defecto, de quien lo crea.
  const [assignedUserId, setAssignedUserId] = useState<string>(me?.id ? String(me.id) : "");
  // Quien lo tenía asignado al abrirlo, por si ya no viene en la lista.
  const [assignedUserName, setAssignedUserName] = useState<string | null>(null);

  const [types, setTypes] = useState<Array<{ label: string; value: string }>>(
    [],
  );
  const [recurrenceTypes, setRecurrenceTypes] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [users, setUsers] = useState<Array<{ label: string; value: string }>>(
    [],
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
        })),
      );

      setRecurrenceTypes(
        Object.entries(recurrenceRes.data).map(([value, label]) => ({
          label: label as string,
          value,
        })),
      );
    } catch (error) {
      console.error("Error loading types:", error);
    }
  };

  // A quién se le puede asignar: GET reminders/users (pide reminders_read,
  // no users_list como la lista de usuarios de Administración).
  const loadUsers = async () => {
    try {
      const body: any = await Services.reminders.getUsers();
      const usersData: any[] = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : body?.data?.data ?? [];

      setUsers(
        usersData.map((user: any) => ({
          label: user.id === me?.id ? `${user.name} (yo)` : user.name,
          value: user.id.toString(),
        })),
      );
    } catch (error: any) {
      console.error("Error loading users:", error);
      alerts.error(
        error?.response?.data?.message ??
          "No se pudo cargar a quién asignarlo; el recordatorio queda para ti.",
      );
    }
  };

  const loadReminder = async () => {
    if (!reminderId) return;

    try {
      setLoading(true);
      const response = await Services.reminders.show(reminderId);
      // El backend responde un ReminderResource: { data: { ...recordatorio } }.
      const body: any = response.data;
      const reminder: App.Entities.Reminder = body?.data ?? body;

      setTitle(reminder.title ?? "");
      setDescription(reminder.description || "");
      setType(reminder.type);
      setReminderDate(new Date(reminder.reminder_date + "T00:00:00"));
      setAmount(reminder.amount?.toString() || "");
      setIsRecurring(Boolean(reminder.is_recurring));
      setRecurrenceType(reminder.recurrence_type || "monthly");
      setRecurrenceInterval(reminder.recurrence_interval?.toString() || "1");
      setNotifyEnabled(Boolean(reminder.notify_enabled));
      setNotifyDaysBefore(reminder.notify_days_before?.toString() || "1");
      setAssignedUserId(reminder.user_id?.toString() || "");
      setAssignedUserName(reminder.user?.name ?? null);
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

    // Monto en formato mexicano ("1,500.50"); antes parseFloat leía 1.
    const withAmount = type === "payment" || type === "renewal";
    const parsedAmount = withAmount && amount.trim() ? parseMoney(amount) : null;
    if (withAmount && amount.trim() && (parsedAmount === null || parsedAmount < 0)) {
      alerts.error("El monto no es válido");
      return;
    }

    try {
      setSaving(true);

      // Los opcionales vacíos viajan como "" (el backend los guarda como
      // null): si no se mandaban, al editar no había forma de borrarlos.
      const data: any = {
        title,
        type,
        reminder_date: toLocalDateString(reminderDate),
        is_recurring: isRecurring === true ? 1 : 0,
        notify_enabled: notifyEnabled === true ? 1 : 0,
        notify_days_before: parseInt(notifyDaysBefore) || 1,
        description: description.trim(),
        amount: parsedAmount ?? "",
        recurrence_type: isRecurring && recurrenceType ? recurrenceType : "",
        recurrence_interval: isRecurring ? parseInt(recurrenceInterval) || 1 : "",
      };

      // Sin elegir a nadie el backend lo asigna a quien lo guarda.
      if (assignedUserId && assignedUserId.trim()) {
        data.user_id = parseInt(assignedUserId);
      }

      if (reminderId) {
        await Services.reminders.update(reminderId, data);
        alerts.success("Recordatorio actualizado correctamente");
      } else {
        await Services.reminders.store(data);
        alerts.success("Recordatorio creado correctamente");
      }

      goBack();
    } catch (error: any) {
      console.error("Error saving reminder:", error);
      console.error("Error response:", error.response?.data);
      console.error("Validation errors:", error.response?.data?.errors);

      // Errores de validación: los mensajes (ya en español), sin el nombre
      // técnico del campo; si no, el mensaje o el error del backend.
      const responseData = error.response?.data;
      if (responseData?.errors) {
        const errorMessages = (Object.values(responseData.errors) as any[])
          .flat()
          .join("\n");
        alerts.error(errorMessages || "Revisa los datos del recordatorio");
      } else {
        alerts.error(
          responseData?.message || responseData?.error || "Error al guardar el recordatorio",
        );
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
    <View style={{ flex: 1, backgroundColor: "transparent" as any }}>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            {/* Tipo */}
            <View style={styles.input}>
              <Text variant="labelLarge" style={styles.fieldLabel}>Tipo de Recordatorio</Text>
              <AppSelect
                value={type}
                onChange={(value) => setType(String(value))}
                readonly={readOnly}
                data={types}
                placeholder="Selecciona un tipo"
              />
            </View>

            {/* Usuario asignado */}
            <View style={styles.input}>
              <Text variant="labelLarge" style={styles.fieldLabel}>Asignar a</Text>
              <AppSelect
                value={assignedUserId}
                onChange={(value) => setAssignedUserId(String(value ?? ""))}
                readonly={readOnly}
                data={
                  // Quien lo tenía asignado aunque ya no venga en la lista
                  // (desactivado o fuera de la empresa): que se vea su nombre.
                  assignedUserId &&
                  assignedUserName &&
                  !users.some((u) => u.value === assignedUserId)
                    ? [...users, { label: assignedUserName, value: assignedUserId }]
                    : users
                }
                placeholder="Yo (si no eliges a nadie)"
              />
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary, marginTop: 4 }}
              >
                El recordatorio solo será visible para el usuario seleccionado
              </Text>
            </View>

            {/* Título */}
            <TextInput
              label="Título"
              value={title}
              onChangeText={setTitle}
              editable={!readOnly}
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
              editable={!readOnly}
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
              disabled={readOnly}
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
                editable={!readOnly}
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
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  Se creará automáticamente el siguiente
                </Text>
              </View>
              <Switch value={isRecurring} onValueChange={setIsRecurring} disabled={readOnly} />
            </View>

            {isRecurring && (
              <>
                <View style={styles.input}>
                  <Text variant="labelLarge" style={styles.fieldLabel}>Frecuencia</Text>
                  <AppSelect
                    value={recurrenceType}
                    onChange={(value) => setRecurrenceType(String(value))}
                    readonly={readOnly}
                    data={recurrenceTypes}
                    placeholder="Selecciona frecuencia"
                  />
                </View>

                <TextInput
                  label="Cada cuántos"
                  value={recurrenceInterval}
                  onChangeText={setRecurrenceInterval}
                  editable={!readOnly}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="numeric" />}
                />
                <HelperText type="info" visible>
                  {`Se repetirá cada ${recurrenceInterval} ${
                    recurrenceTypes.find((r) => r.value === recurrenceType)
                      ?.label || "período"
                  }`}
                </HelperText>
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
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  Recibe alertas antes de la fecha
                </Text>
              </View>
              <Switch value={notifyEnabled} onValueChange={setNotifyEnabled} disabled={readOnly} />
            </View>

            {notifyEnabled && (
              <>
                <TextInput
                  label="Notificar días antes"
                  value={notifyDaysBefore}
                  onChangeText={setNotifyDaysBefore}
                  editable={!readOnly}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                  left={<TextInput.Icon icon="calendar-alert" />}
                />
                <HelperText type="info" visible>
                  {`Recibirás una notificación ${notifyDaysBefore} días antes`}
                </HelperText>
              </>
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

        {readOnly && (
          <View
            style={[styles.readOnlyNote, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
            <Text variant="bodySmall" style={[styles.readOnlyText, { color: colors.textSecondary }]}>
              Solo lectura: no tienes permiso para editar recordatorios.
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => goBack()}
            style={styles.button}
            disabled={saving}
          >
            {readOnly ? "Volver" : "Cancelar"}
          </Button>
          {!readOnly && (
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
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: palette.textSecondary,
    marginBottom: 6,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent" as any,
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
    backgroundColor: "transparent" as any,
    borderRadius: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  readOnlyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  readOnlyText: { flex: 1, lineHeight: 18 },
  button: {
    flex: 1,
  },
});
