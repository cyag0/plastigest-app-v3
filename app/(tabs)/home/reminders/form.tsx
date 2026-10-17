/**
 * Recordatorio: algo que hay que hacer en una fecha (pagarle a un proveedor,
 * renovar un servicio, revisar una caducidad). Es de una persona: solo ella lo
 * ve y a ella le llegan los avisos.
 *
 *   Título, tipo, fecha (y monto si es un pago o una renovación), descripción
 *   y a quién se le asigna.
 *   Repetición: al completarlo se crea el siguiente (cada N días, semanas…).
 *   Avisos: N días antes y otro el mismo día (0 = solo el mismo día).
 */

import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import AppDatePicker from "@/components/Form/AppDatePicker";
import AppInput from "@/components/Form/AppInput";
import AppSelect from "@/components/Form/AppSelect";
import AppSwitch from "@/components/Form/AppSwitch";
import { FORM_MAX_WIDTH, FormFooter, FormRow, FormSection } from "@/components/Form/FormLayout";
import AmountPreview from "@/components/Pos/AmountPreview";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate, parseLocalDate, toLocalDateString } from "@/utils/dates";
import { claimErrorAlert, errorMessageOf } from "@/utils/errorNotice";
import { formatMoney, parseMoney } from "@/utils/format";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Button } from "react-native-paper";

interface ReminderFormProps {
  id?: number;
}

/** Los tipos del backend, en oración (el servidor los manda en mayúsculas). */
const TYPE_LABELS: Record<string, string> = {
  payment: "Pago a proveedor",
  renewal: "Renovación de servicio",
  expiration: "Vencimiento de producto",
  other: "Otro",
};

/** Solo los pagos y las renovaciones llevan monto. */
const TYPES_WITH_AMOUNT = ["payment", "renewal"];

/**
 * Cada cuánto se repite. La fecha del siguiente se calcula como en el backend
 * (Reminder::createNextRecurrence, con Carbon): el 31 de enero más un mes cae
 * en marzo, igual que con Date.
 */
const PERIODS: Record<string, { one: string; many: string; add: (date: Date, n: number) => void }> =
  {
    daily: { one: "Día", many: "Días", add: (d, n) => d.setDate(d.getDate() + n) },
    weekly: { one: "Semana", many: "Semanas", add: (d, n) => d.setDate(d.getDate() + 7 * n) },
    monthly: { one: "Mes", many: "Meses", add: (d, n) => d.setMonth(d.getMonth() + n) },
    yearly: { one: "Año", many: "Años", add: (d, n) => d.setFullYear(d.getFullYear() + n) },
  };

const TITLE_MAX = 255;

const listRoute = "/(tabs)/home/reminders";

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Solo dígitos (cada cuántos, días antes). */
const digits = (text: string) => text.replace(/\D/g, "");

/**
 * Etiqueta, campo y, debajo, el error (al intentar guardar) o una ayuda
 * corta: lo mismo que pintan los campos de AppForm.
 */
function Field({
  label,
  optional,
  error,
  hint,
  children,
  style,
}: {
  label: string;
  optional?: boolean;
  error?: string | null;
  hint?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, style]}>
      <InputLabel label={label} optional={optional} />
      {children}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : typeof hint === "string" ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : (
        (hint ?? null)
      )}
    </View>
  );
}

export default function ReminderForm(props: ReminderFormProps) {
  const params = useLocalSearchParams();
  const reminderId = props.id || (params.id ? parseInt(params.id as string) : undefined);
  const alerts = useAlerts();
  const navigation = useNavigation();

  const { user: me } = useAuth();
  // Abrir uno existente pide reminders_read (guard de rutas); guardarlo,
  // reminders_update. Sin él el formulario queda de solo lectura.
  const { canUpdate } = useCan();
  const readOnly = !!reminderId && !canUpdate("reminders");
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [loading, setLoading] = useState(!!reminderId);
  // No se pudo cargar (borrado, de otra empresa, red…): se explica en lugar
  // de un formulario vacío que parecía nuevo.
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);
  // Candado del guardado: un doble toque no crea dos recordatorios.
  const { submitting: saving, run } = useSubmitGuard();
  // Se intentó guardar: desde ahí se marcan los campos que faltan.
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("other");
  const [reminderDate, setReminderDate] = useState(toLocalDateString());
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

  const [types, setTypes] = useState(toOptions(TYPE_LABELS));
  const [recurrenceLabels, setRecurrenceLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(PERIODS).map(([value, period]) => [value, period.one])),
  );
  const [users, setUsers] = useState<{ label: string; value: string }[]>([]);

  // Título de la barra en el teléfono (en web lo ponen las migas de la ruta).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: !reminderId ? "Nuevo recordatorio" : readOnly ? "Recordatorio" : "Editar recordatorio",
    });
  }, [navigation, reminderId, readOnly]);

  // Los tipos y las frecuencias que acepta el backend; los textos, los de aquí.
  const loadTypes = async () => {
    try {
      const [typesRes, recurrenceRes] = await Promise.all([
        Services.reminders.getTypes(),
        Services.reminders.getRecurrenceTypes(),
      ]);
      setTypes(
        Object.entries(typesRes.data as Record<string, string>).map(([value, label]) => ({
          value,
          label: TYPE_LABELS[value] ?? label,
        })),
      );
      setRecurrenceLabels(recurrenceRes.data as Record<string, string>);
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
          : (body?.data?.data ?? []);

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
      // silent: si falla, la pantalla lo explica en lugar del formulario.
      const response = await Services.reminders.show(reminderId, undefined, { silent: true });
      // El backend responde un ReminderResource: { data: { ...recordatorio } }.
      const body: any = response.data;
      const reminder: App.Entities.Reminder = body?.data ?? body;

      setTitle(reminder.title ?? "");
      setDescription(reminder.description || "");
      setType(reminder.type);
      setReminderDate(toLocalDateString(parseLocalDate(reminder.reminder_date)));
      setAmount(reminder.amount?.toString() || "");
      setIsRecurring(Boolean(reminder.is_recurring));
      setRecurrenceType(reminder.recurrence_type || "monthly");
      setRecurrenceInterval(reminder.recurrence_interval?.toString() || "1");
      setNotifyEnabled(Boolean(reminder.notify_enabled));
      setNotifyDaysBefore(reminder.notify_days_before?.toString() ?? "1");
      setAssignedUserId(reminder.user_id?.toString() || "");
      setAssignedUserName(reminder.user?.name ?? null);
    } catch (error) {
      setLoadProblem(
        recordLoadProblem(error, "No se pudo cargar el recordatorio. Inténtalo de nuevo."),
      );
    } finally {
      setLoading(false);
    }
  };

  // Al abrir, `loading` ya empieza en true si hay recordatorio que cargar.
  useEffect(() => {
    void (async () => {
      await Promise.all([loadTypes(), loadUsers(), loadReminder()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderId]);

  const retryLoad = () => {
    setLoadProblem(null);
    setLoading(true);
    loadReminder();
  };

  // Monto en formato mexicano ("1,500.50"); antes parseFloat leía 1.
  const withAmount = TYPES_WITH_AMOUNT.includes(type);
  const parsedAmount = withAmount && amount.trim() ? parseMoney(amount) : null;
  const interval = parseInt(recurrenceInterval, 10);
  const daysBefore = parseInt(notifyDaysBefore, 10);

  // Lo que falta o está mal; se marca después del primer intento de guardar.
  const problems = {
    title: !title.trim() ? "Escribe el título" : null,
    type: !type ? "Elige el tipo" : null,
    amount:
      withAmount && amount.trim() && (parsedAmount === null || parsedAmount < 0)
        ? "Escríbelo como 1500 o 1,500.50"
        : null,
    interval: isRecurring && !(interval >= 1) ? "Escribe cada cuántos (1 o más)" : null,
    daysBefore:
      notifyEnabled && !(daysBefore >= 0) ? "Escribe cuántos días antes (0 es el mismo día)" : null,
  };
  const invalid = Object.values(problems).some(Boolean);
  const shown = (key: keyof typeof problems) => (attempted ? problems[key] : null);

  const handleSubmit = () =>
    run(async () => {
      setAttempted(true);
      setServerError(null);
      if (invalid) return;

      try {
        // Los opcionales vacíos viajan como "" (el backend los guarda como
        // null): si no se mandaban, al editar no había forma de borrarlos.
        const data: any = {
          title: title.trim(),
          type,
          reminder_date: reminderDate,
          is_recurring: isRecurring ? 1 : 0,
          notify_enabled: notifyEnabled ? 1 : 0,
          // 0 = solo el mismo día (antes se convertía en 1).
          notify_days_before: Number.isNaN(daysBefore) ? 1 : daysBefore,
          description: description.trim(),
          amount: parsedAmount ?? "",
          recurrence_type: isRecurring && recurrenceType ? recurrenceType : "",
          recurrence_interval: isRecurring ? interval || 1 : "",
        };

        // Sin elegir a nadie el backend lo asigna a quien lo guarda.
        if (assignedUserId && assignedUserId.trim()) {
          data.user_id = parseInt(assignedUserId);
        }

        if (reminderId) {
          await Services.reminders.update(reminderId, data);
        } else {
          await Services.reminders.store(data);
        }
        alerts.success("Recordatorio guardado");
        goBack(listRoute);
      } catch (error: any) {
        console.error("Error saving reminder:", error);
        // El motivo del servidor (con el primer error de validación) va en la
        // barra de abajo: que el aviso global de la app no salga encima (en el
        // teléfono tapaba los botones). store/update no aceptan `silent`.
        const message = errorMessageOf(error, "No se pudo guardar el recordatorio.");
        claimErrorAlert(message);
        setServerError(message);
      }
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (loadProblem) {
    return (
      <RecordLoadError
        problem={loadProblem}
        notFoundTitle="No se encontró el recordatorio"
        errorTitle="No se pudo cargar el recordatorio"
        onRetry={retryLoad}
      />
    );
  }

  // Quien lo tenía asignado aunque ya no venga en la lista (desactivado o
  // fuera de la empresa): que se vea su nombre.
  const userOptions =
    assignedUserId && assignedUserName && !users.some((u) => u.value === assignedUserId)
      ? [...users, { label: assignedUserName, value: assignedUserId }]
      : users;

  // "Cada 1 mes", "cada 2 meses".
  const periodOptions = Object.entries(recurrenceLabels).map(([value, label]) => {
    const period = PERIODS[value];
    return { value, label: period ? (interval > 1 ? period.many : period.one) : label };
  });

  // Cuándo quedaría el siguiente al completar este.
  let nextDate: string | null = null;
  if (isRecurring && interval >= 1 && PERIODS[recurrenceType] && reminderDate) {
    const next = parseLocalDate(reminderDate);
    PERIODS[recurrenceType].add(next, interval);
    nextDate = formatDate(next);
  }

  const daysHint =
    daysBefore === 0
      ? "Avisa solo el mismo día."
      : daysBefore === 1
        ? "Avisa 1 día antes y el mismo día."
        : daysBefore > 1
          ? `Avisa ${daysBefore} días antes y el mismo día.`
          : undefined;

  const note =
    serverError ??
    (attempted && invalid ? "Falta completar o corregir los campos marcados." : null);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.column}>
          <FormSection>
            <Field label="Título" error={shown("title")}>
              <AppInput
                value={title}
                onChange={setTitle}
                placeholder="Por ejemplo, Pagar la renta del local"
                maxLength={TITLE_MAX}
                hasError={!!shown("title")}
                readonly={readOnly}
              />
            </Field>

            <Field label="Tipo" error={shown("type")}>
              <AppSelect
                value={type}
                onChange={(value) => setType(String(value))}
                data={types}
                placeholder="Elige el tipo"
                hideSearchBox
                readonly={readOnly}
              />
            </Field>

            <FormRow>
              <Field label="Fecha">
                <AppDatePicker
                  value={reminderDate}
                  onChange={(value) => setReminderDate(value)}
                  readonly={readOnly}
                />
              </Field>
              {withAmount && (
                <Field
                  label="Monto"
                  // «(opcional)» solo cuando se puede escribir.
                  optional={!readOnly}
                  error={shown("amount")}
                  hint={
                    !readOnly && parsedAmount !== null && parsedAmount >= 0 ? (
                      <AmountPreview value={amount} label="Se guardará" />
                    ) : undefined
                  }
                >
                  {readOnly ? (
                    <ReadonlyText text={parsedAmount !== null ? formatMoney(parsedAmount) : ""} />
                  ) : (
                    <AppInput
                      value={amount}
                      onChange={setAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      hasError={!!shown("amount")}
                    />
                  )}
                </Field>
              )}
            </FormRow>

            <Field label="Descripción" optional={!readOnly}>
              <AppInput
                value={description}
                onChange={setDescription}
                multiline
                numberOfLines={3}
                readonly={readOnly}
              />
            </Field>

            <Field
              label="Asignar a"
              hint={readOnly ? undefined : "Solo esa persona lo ve y le llegan los avisos."}
            >
              <AppSelect
                value={assignedUserId}
                onChange={(value) => setAssignedUserId(String(value ?? ""))}
                data={userOptions}
                placeholder="Yo (si no eliges a nadie)"
                hideSearchBox={userOptions.length < 8}
                readonly={readOnly}
              />
            </Field>
          </FormSection>

          <FormSection title="Repetición">
            <View style={styles.field}>
              <AppSwitch
                label="Se repite"
                description="Al completarlo se crea el siguiente."
                value={isRecurring}
                onChange={setIsRecurring}
                readonly={readOnly}
              />
            </View>

            {isRecurring && (
              <FormRow widths={[1, 2]}>
                <Field label="Cada" error={shown("interval")}>
                  <AppInput
                    value={recurrenceInterval}
                    onChange={(text) => setRecurrenceInterval(digits(text))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={3}
                    hasError={!!shown("interval")}
                    readonly={readOnly}
                  />
                </Field>
                <Field
                  label="Periodo"
                  hint={!readOnly && nextDate ? `El siguiente sería el ${nextDate}.` : undefined}
                >
                  <AppSelect
                    value={recurrenceType}
                    onChange={(value) => setRecurrenceType(String(value))}
                    data={periodOptions}
                    hideSearchBox
                    readonly={readOnly}
                  />
                </Field>
              </FormRow>
            )}
          </FormSection>

          <FormSection title="Avisos">
            <View style={styles.field}>
              <AppSwitch
                label="Enviar avisos"
                description="Le llegan a quien lo tiene asignado."
                value={notifyEnabled}
                onChange={setNotifyEnabled}
                readonly={readOnly}
              />
            </View>

            {notifyEnabled && (
              <FormRow>
                <Field
                  label="Días antes"
                  error={shown("daysBefore")}
                  hint={readOnly ? undefined : daysHint}
                >
                  <AppInput
                    value={notifyDaysBefore}
                    onChange={(text) => setNotifyDaysBefore(digits(text))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={3}
                    hasError={!!shown("daysBefore")}
                    readonly={readOnly}
                  />
                </Field>
                {/* En pantallas anchas el campo ocupa media fila. */}
                <View />
              </FormRow>
            )}
          </FormSection>
        </View>
      </ScrollView>

      {readOnly ? (
        <FormFooter>
          <Button mode="outlined" onPress={() => goBack(listRoute)} style={{ flex: 1 }}>
            Volver
          </Button>
          <View style={styles.readOnlyHint}>
            <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
            <Text style={styles.readOnlyText}>Solo lectura</Text>
          </View>
        </FormFooter>
      ) : (
        <FormFooter
          onCancel={() => goBack(listRoute)}
          submitLabel={reminderId ? "Guardar cambios" : "Guardar recordatorio"}
          onSubmit={handleSubmit}
          loading={saving}
          note={note}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.background,
  },
  content: { padding: 16, paddingBottom: 32 },
  // La columna mide lo mismo que la de la barra de abajo.
  column: { width: "100%", maxWidth: FORM_MAX_WIDTH, alignSelf: "center" },
  field: { marginBottom: 18 },
  error: { color: c.error, fontSize: 13, lineHeight: 18, marginTop: 6 },
  hint: { color: c.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
  readOnlyHint: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  readOnlyText: { fontSize: 13, color: c.textMuted },
}));
