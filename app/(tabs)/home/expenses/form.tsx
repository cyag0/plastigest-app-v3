/**
 * Gasto de la sucursal (gas, renta, sueldos, transporte…). Arriba qué fue y
 * cuánto; abajo cómo se pagó: el efectivo que sale de la caja se descuenta en
 * el corte, y el que pagó el dueño de su bolsa no.
 *
 * El efectivo de la caja sale del turno de una caja: el de quien lo registra
 * o, si no tiene, el que elige de los abiertos en la sucursal (Caja 1 · turno
 * de Juan); así lo ve el cajero en su corte. Si nadie tiene turno, no se
 * puede pagar con la caja.
 *
 * Un gasto que ya entró en un turno de caja cerrado no cambia de monto,
 * método, fecha ni «pagado con caja» (el corte ya se firmó): al guardar, el
 * servidor lo dice, esos campos vuelven a lo guardado y se bloquean; la
 * categoría y la descripción sí se pueden cambiar.
 */

import CashSourcePicker, {
  CASH_SOURCE_CODES,
  useOpenCashSessions,
  type CurrentCashSession,
} from "@/components/Cash/CashSourcePicker";
import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import SegmentedControl from "@/components/App/SegmentedControl";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import AppDatePicker from "@/components/Form/AppDatePicker";
import AppInput from "@/components/Form/AppInput";
import AppSelect from "@/components/Form/AppSelect";
import AppSwitch from "@/components/Form/AppSwitch";
import { FORM_MAX_WIDTH, FormFooter, FormRow, FormSection } from "@/components/Form/FormLayout";
import AmountPreview from "@/components/Pos/AmountPreview";
import { apiErrorCode, apiErrorMessage, SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { parseLocalDate, toLocalDateString } from "@/utils/dates";
import { claimErrorAlert } from "@/utils/errorNotice";
import { formatMoney, parseMoney } from "@/utils/format";
import { roundMoney } from "@/utils/money";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

interface ExpenseFormProps {
  id?: number;
  readonly?: boolean;
}

type PaymentMethod = "efectivo" | "tarjeta" | "transferencia";

/** Los del backend (Expense::getPaymentMethods): tarjeta y transferencia nunca salen de la caja. */
const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
];

/** Lo guardado de los campos que mueven la caja. */
type LoadedMoney = {
  amount: string;
  paymentMethod: PaymentMethod;
  paidFromCash: boolean;
  expenseDate: string;
};

/** La descripción admite 1000 caracteres (validación del backend). */
const DESCRIPTION_MAX = 1000;

const listRoute = "/(tabs)/home/expenses";

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

export default function ExpenseForm(props: ExpenseFormProps) {
  const params = useLocalSearchParams();
  const expenseId = props.id || (params.id ? parseInt(params.id as string) : undefined);
  const alerts = useAlerts();
  const navigation = useNavigation();

  const { location } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { can } = useCan();
  // Guardar cambios pide expenses_update (crear, expenses_create): sin él el
  // gasto se ve en «Solo lectura» en lugar de responder 403 al guardar.
  const canSave = can(expenseId ? "expenses_update" : "expenses_create");
  // Sin permiso para guardar, los datos se ven pero no se pueden cambiar.
  const readOnly = !canSave || !!props.readonly;

  const [loading, setLoading] = useState(!!expenseId);
  // El gasto no se pudo cargar (404 de otra sucursal o borrado, red…): en
  // lugar del formulario vacío se explica por qué.
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);
  // Candado del guardado: un doble toque no crea dos gastos.
  const { submitting: saving, run } = useSubmitGuard();
  // El gasto ya entró en un turno de caja cerrado: monto, método, fecha y
  // "pagado con caja" no se pueden cambiar (el corte ya se firmó).
  const [moneyLocked, setMoneyLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  // Se intentó guardar: desde ahí se marcan los campos que faltan.
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Lo cargado del gasto, para devolver los campos de dinero al bloquearlos.
  const loadedRef = useRef<LoadedMoney | null>(null);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(toLocalDateString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  // ¿El efectivo salió de la caja de la sucursal? Si lo pagó el dueño de su
  // bolsa, no debe descontarse en el corte.
  const [paidFromCash, setPaidFromCash] = useState(true);
  // De qué caja sale el efectivo cuando quien lo registra no tiene turno.
  const [cashSessionId, setCashSessionId] = useState<number | null>(null);
  // Al editar: el turno donde ya está el egreso.
  const [currentSession, setCurrentSession] = useState<CurrentCashSession | null>(null);
  // Lo guardado (como loadedRef), para saber si la edición mueve la caja.
  const [loadedMoney, setLoadedMoney] = useState<LoadedMoney | null>(null);

  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);

  // Título de la barra en el teléfono (en web lo ponen las migas de la ruta).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: !expenseId ? "Nuevo gasto" : readOnly ? "Gasto" : "Editar gasto",
    });
  }, [navigation, expenseId, readOnly]);

  const loadCategories = async () => {
    try {
      const response = await Services.expenses.getCategories();
      setCategories(
        Object.entries(response.data).map(([value, label]) => ({
          label: label as string,
          value,
        })),
      );
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadExpense = async () => {
    if (!expenseId) return;

    try {
      // silent: si falla, la pantalla lo explica en lugar del formulario.
      const response = await Services.expenses.show(expenseId, undefined, { silent: true });
      // El backend responde un ExpenseResource: { data: { ...gasto } }.
      const body: any = response.data;
      const expense: App.Entities.Expense & {
        paid_from_cash?: boolean;
        cash_session?: CurrentCashSession | null;
      } = body?.data ?? body;

      const loaded = {
        amount: expense.amount != null ? String(expense.amount) : "",
        paymentMethod: expense.payment_method as PaymentMethod,
        paidFromCash: expense.paid_from_cash ?? true,
        expenseDate: toLocalDateString(parseLocalDate(expense.expense_date)),
      };
      loadedRef.current = loaded;
      setLoadedMoney(loaded);
      setCategory(expense.category);
      setAmount(loaded.amount);
      setPaymentMethod(loaded.paymentMethod);
      setPaidFromCash(loaded.paidFromCash);
      setDescription(expense.description ?? "");
      setExpenseDate(loaded.expenseDate);
      setCurrentSession(expense.cash_session ?? null);
    } catch (error) {
      setLoadProblem(recordLoadProblem(error, "No se pudo cargar el gasto. Inténtalo de nuevo."));
    } finally {
      setLoading(false);
    }
  };

  // Al abrir, `loading` ya empieza en true si hay gasto que cargar.
  useEffect(() => {
    void (async () => {
      await Promise.all([loadCategories(), loadExpense()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseId]);

  const retryLoad = () => {
    setLoadProblem(null);
    setLoading(true);
    loadExpense();
  };

  /** Monto escrito en formato mexicano ("1,500" son mil quinientos; antes se leía 1). */
  const parsedAmount = parseMoney(amount);

  // Lo que falta o está mal; se marca después del primer intento de guardar.
  const problems = {
    category: !category ? "Elige la categoría" : null,
    description: !description.trim() ? "Escribe en qué se gastó" : null,
    amount: !amount.trim()
      ? "Escribe el monto"
      : parsedAmount === null
        ? "Escríbelo como 1500 o 1,500.50"
        : parsedAmount <= 0
          ? "El monto debe ser mayor a 0"
          : null,
  };

  // ¿Sale efectivo de la caja con lo que se va a guardar? Al editar, solo si
  // cambia el dinero: si no, el servidor no toca la caja.
  const moneyChanged =
    !expenseId ||
    !loadedMoney ||
    loadedMoney.paymentMethod !== paymentMethod ||
    loadedMoney.paidFromCash !== paidFromCash ||
    loadedMoney.expenseDate !== expenseDate ||
    parseMoney(loadedMoney.amount) !== parsedAmount;
  const cashOut = paymentMethod === "efectivo" && paidFromCash && !moneyLocked && moneyChanged;
  const cash = useOpenCashSessions(cashOut, currentSession);
  const cashProblem = cash.problem(cashSessionId);

  const invalid = Object.values(problems).some(Boolean) || !!cashProblem;
  const shown = (key: keyof typeof problems) => (attempted ? problems[key] : null);

  /**
   * Turno cerrado: los campos de dinero vuelven a lo guardado y se bloquean;
   * categoría y descripción se pueden seguir cambiando y guardando.
   */
  const lockMoneyFields = (message: string) => {
    const loaded = loadedRef.current;
    if (loaded) {
      setAmount(loaded.amount);
      setPaymentMethod(loaded.paymentMethod);
      setPaidFromCash(loaded.paidFromCash);
      setExpenseDate(loaded.expenseDate);
    }
    setMoneyLocked(true);
    setLockMessage(
      `${message} Solo puedes cambiar la categoría y la descripción; los demás datos se dejaron como estaban.`,
    );
  };

  const handleSubmit = () =>
    run(async () => {
      setAttempted(true);
      setServerError(null);
      if (invalid || parsedAmount === null) return;

      try {
        const data = {
          category,
          amount: roundMoney(parsedAmount),
          payment_method: paymentMethod,
          // Bloqueado (turno cerrado) se manda tal como estaba guardado.
          paid_from_cash:
            moneyLocked && loadedRef.current
              ? loadedRef.current.paidFromCash
              : paymentMethod === "efectivo"
                ? paidFromCash
                : false,
          description: description.trim(),
          expense_date: expenseDate,
          // Sin turno propio: la caja de donde sale el efectivo.
          ...(cashOut && cashSessionId ? { cash_register_session_id: cashSessionId } : {}),
        };

        if (expenseId) {
          await Services.expenses.update(expenseId, data);
        } else {
          await Services.expenses.store(data);
        }
        alerts.success("Gasto guardado");
        goBack(listRoute);
      } catch (error: any) {
        console.error("Error saving expense:", error);
        const message = apiErrorMessage(error, "No se pudo guardar el gasto. Inténtalo de nuevo.");
        // El motivo va en la barra de abajo: que el aviso global de la app no
        // salga encima (en el teléfono tapaba los botones). store/update no
        // aceptan `silent`.
        claimErrorAlert(message);
        if (expenseId && apiErrorCode(error) === SALE_ERROR_CODES.closedSession) {
          lockMoneyFields(message);
          return;
        }
        // Se cerró el turno elegido o el propio: se vuelven a pedir los abiertos.
        if (CASH_SOURCE_CODES.includes(apiErrorCode(error) ?? "")) cash.reload();
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
        notFoundTitle="No se encontró el gasto"
        errorTitle="No se pudo cargar el gasto"
        onRetry={retryLoad}
      />
    );
  }

  const paymentLabel =
    PAYMENT_METHODS.find((method) => method.value === paymentMethod)?.label ?? paymentMethod;
  const moneyDisabled = moneyLocked || readOnly;
  // Lo bloqueado se ve atenuado y no responde (la fecha y el método no
  // tienen "disabled" propio).
  const lockedStyle: StyleProp<ViewStyle> = moneyLocked ? styles.locked : undefined;

  // La barra de abajo dice qué pasó al guardar: el error del servidor, lo
  // que falta o, con el turno cerrado, qué se puede cambiar todavía.
  let note: string | null = null;
  let noteTone: "error" | "warning" = "error";
  if (serverError) note = serverError;
  else if (attempted && cashProblem && !Object.values(problems).some(Boolean)) note = cashProblem;
  else if (attempted && invalid) note = "Falta completar o corregir los campos marcados.";
  else if (lockMessage) {
    note = lockMessage;
    noteTone = "warning";
  }

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
          <FormSection
            title="Gasto"
            description={location ? `Se registra en ${location.name}.` : undefined}
          >
            <Field label="Categoría" error={shown("category")}>
              <AppSelect
                value={category}
                onChange={(value) => setCategory(String(value))}
                data={categories}
                placeholder="Elige una categoría"
                hideSearchBox
                readonly={readOnly}
              />
            </Field>

            <Field label="Descripción" error={shown("description")}>
              <AppInput
                value={description}
                onChange={setDescription}
                placeholder="Por ejemplo, Gas para la cocina"
                multiline
                numberOfLines={3}
                maxLength={DESCRIPTION_MAX}
                hasError={!!shown("description")}
                readonly={readOnly}
              />
            </Field>

            <FormRow>
              <Field
                label="Monto"
                error={moneyDisabled ? null : shown("amount")}
                hint={
                  // Cómo se leyó lo escrito ("1,500" → $1,500.00).
                  !moneyDisabled && parsedAmount !== null && parsedAmount > 0 ? (
                    <AmountPreview value={amount} label="Se registrará" />
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
                    disabled={moneyLocked}
                  />
                )}
              </Field>
              <Field label="Fecha">
                <View style={lockedStyle}>
                  <AppDatePicker
                    value={expenseDate}
                    onChange={(value) => setExpenseDate(value)}
                    readonly={readOnly}
                  />
                </View>
              </Field>
            </FormRow>
          </FormSection>

          <FormSection title="Pago">
            <Field label="Método de pago">
              {readOnly ? (
                <ReadonlyText text={paymentLabel} />
              ) : (
                <View style={lockedStyle}>
                  <SegmentedControl
                    options={PAYMENT_METHODS}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    stretch
                    style={styles.segmented}
                    accessibilityLabel="Método de pago"
                  />
                </View>
              )}
            </Field>

            {/* Tarjeta y transferencia nunca salen de la caja. */}
            {paymentMethod === "efectivo" && (
              <View style={styles.field}>
                <AppSwitch
                  label="Pagado con dinero de la caja"
                  description={
                    paidFromCash
                      ? "Sale del cajón: se descuenta en el corte del turno de esa caja."
                      : "No afecta el corte: lo pagó el dueño u otra fuente."
                  }
                  value={paidFromCash}
                  onChange={setPaidFromCash}
                  disabled={moneyLocked}
                  readonly={readOnly}
                />
              </View>
            )}

            {paymentMethod === "efectivo" && paidFromCash && (
              <View style={styles.field}>
                <CashSourcePicker
                  state={cash}
                  active={cashOut || currentSession?.status === "open"}
                  value={cashSessionId}
                  onChange={setCashSessionId}
                  current={currentSession}
                  emptyHint="quita «Pagado con dinero de la caja» si lo pagó el dueño u otra fuente"
                  showError={attempted}
                  readonly={readOnly || moneyLocked}
                />
              </View>
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
          submitLabel={expenseId ? "Guardar cambios" : "Guardar gasto"}
          onSubmit={handleSubmit}
          loading={saving}
          note={note}
          noteTone={noteTone}
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
  segmented: { minHeight: 48 },
  field: { marginBottom: 18 },
  error: { color: c.error, fontSize: 13, lineHeight: 18, marginTop: 6 },
  hint: { color: c.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6 },
  locked: { opacity: 0.55, pointerEvents: "none" },
  readOnlyHint: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  readOnlyText: { fontSize: 13, color: c.textMuted },
}));
