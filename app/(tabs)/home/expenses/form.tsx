import { goBack } from "@/utils/navigation";
import AmountPreview from "@/components/Pos/AmountPreview";
import { apiErrorCode, apiErrorMessage, SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { parseMoney } from "@/utils/format";
import { roundMoney } from "@/utils/money";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { parseLocalDate, toLocalDateString } from "@/utils/dates";
import palette from "@/constants/palette";
import AppSelect from "@/components/Form/AppSelect";
import { DatePickerInput } from "react-native-paper-dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ExpenseFormProps {
  id?: number;
  readonly?: boolean;
}

export default function ExpenseForm(props: ExpenseFormProps) {
  const params = useLocalSearchParams();
  const expenseId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const alerts = useAlerts();

  const { location, selectedCompany } = useAuth();

  const [loading, setLoading] = useState(false);
  // Candado del guardado: un doble toque no crea dos gastos.
  const { submitting: saving, run } = useSubmitGuard();
  // El gasto ya entró en un turno de caja cerrado: monto, método, fecha y
  // "pagado con caja" no se pueden cambiar (el corte ya se firmó).
  const [moneyLocked, setMoneyLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  // Lo cargado del gasto, para devolver los campos de dinero al bloquearlos.
  const loadedRef = useRef<{ amount: string; paymentMethod: string; paidFromCash: boolean; expenseDate: Date } | null>(null);

  // Form fields
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  // ¿El efectivo salió de la caja de la sucursal? Si lo pagó el dueño de su
  // bolsa, no debe descontarse en el corte. Tarjeta y transferencia nunca
  // salen de la caja.
  const [paidFromCash, setPaidFromCash] = useState(true);
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());

  const [categories, setCategories] = useState<
    Array<{ label: string; value: string }>
  >([]);

  useEffect(() => {
    loadCategories();
    if (expenseId) {
      loadExpense();
    }
  }, [expenseId]);

  const loadCategories = async () => {
    try {
      const response = await Services.expenses.getCategories();
      const categoriesData = Object.entries(response.data).map(
        ([value, label]) => ({
          label: label as string,
          value,
        })
      );
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadExpense = async () => {
    if (!expenseId) return;

    try {
      setLoading(true);
      const response = await Services.expenses.show(expenseId);
      // El backend responde un ExpenseResource: { data: { ...gasto } }.
      const body: any = response.data;
      const expense: App.Entities.Expense & { paid_from_cash?: boolean } =
        body?.data ?? body;

      const loaded = {
        amount: expense.amount != null ? String(expense.amount) : "",
        paymentMethod: expense.payment_method,
        paidFromCash: expense.paid_from_cash ?? true,
        expenseDate: parseLocalDate(expense.expense_date),
      };
      loadedRef.current = loaded;
      setCategory(expense.category);
      setAmount(loaded.amount);
      setPaymentMethod(loaded.paymentMethod);
      setPaidFromCash(loaded.paidFromCash);
      setDescription(expense.description ?? "");
      setExpenseDate(loaded.expenseDate);
    } catch (error) {
      console.error("Error loading expense:", error);
      alerts.error("Error al cargar el gasto");
    } finally {
      setLoading(false);
    }
  };

  /** Monto escrito en formato mexicano ("1,500" son mil quinientos; antes se leía 1). */
  const parsedAmount = parseMoney(amount);

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
      `${message} Solo puedes cambiar la categoría y la descripción; los demás campos se dejaron como estaban.`,
    );
  };

  const handleSubmit = () =>
    run(async () => {
      // Validations
      if (!category) {
        alerts.error("Selecciona una categoría");
        return;
      }
      if (parsedAmount === null || parsedAmount <= 0) {
        alerts.error("Ingresa un monto válido: escríbelo como 1500 o 1,500.50");
        return;
      }
      if (!description) {
        alerts.error("Ingresa una descripción");
        return;
      }

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
          description,
          expense_date: toLocalDateString(expenseDate),
        };

        if (expenseId) {
          await Services.expenses.update(expenseId, data);
          alerts.success("Gasto actualizado correctamente");
        } else {
          await Services.expenses.store(data);
          alerts.success("Gasto creado correctamente");
        }

        goBack();
      } catch (error: any) {
        console.error("Error saving expense:", error);
        const message = apiErrorMessage(error, "Error al guardar el gasto");
        if (expenseId && apiErrorCode(error) === SALE_ERROR_CODES.closedSession) {
          lockMoneyFields(message);
          return;
        }
        alerts.error(message);
      }
    });

  const paymentMethods = [
    { label: "Efectivo", value: "efectivo", icon: "cash" },
    { label: "Tarjeta", value: "tarjeta", icon: "credit-card" },
    {
      label: "Transferencia",
      value: "transferencia",
      icon: "bank-transfer",
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 16 }}>Cargando gasto...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" as any }}>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            {!!lockMessage && (
              <View style={styles.lockBanner}>
                <MaterialCommunityIcons name="lock-outline" size={18} color={palette.warning} />
                <Text variant="bodySmall" style={styles.lockText}>
                  {lockMessage}
                </Text>
              </View>
            )}

            {/* Categoría */}
            <View style={styles.input}>
              <AppSelect
                value={category}
                onChange={(value) => setCategory(String(value))}
                data={categories}
                placeholder="Selecciona una categoría"
              />
            </View>

            {/* Monto */}
            <TextInput
              label="Monto"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              mode="outlined"
              style={[styles.input, { marginBottom: 0 }]}
              left={<TextInput.Icon icon="currency-usd" />}
              error={!!amount.trim() && (parsedAmount === null || parsedAmount <= 0)}
              disabled={moneyLocked}
            />
            <View style={styles.amountPreview}>
              <AmountPreview value={amount} label="Se registrará" />
            </View>

            {/* Método de Pago */}
            <Text variant="labelLarge" style={styles.label}>
              Método de Pago
            </Text>
            <View style={styles.paymentMethodsContainer}>
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  mode={paymentMethod === method.value ? "contained" : "outlined"}
                  onPress={() => setPaymentMethod(method.value)}
                  disabled={moneyLocked}
                  icon={method.icon}
                  style={styles.paymentButton}
                  buttonColor={
                    paymentMethod === method.value ? palette.primary : undefined
                  }
                  textColor={
                    paymentMethod === method.value ? "#fff" : palette.primary
                  }
                  compact
                >
                  {method.label}
                </Button>
              ))}
            </View>

            {paymentMethod === "efectivo" && (
              <View style={styles.cashRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">Pagado con dinero de la caja</Text>
                  <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                    {paidFromCash
                      ? "Se descontará del efectivo en el corte de caja."
                      : "No afecta el corte (lo pagó el dueño u otra fuente)."}
                  </Text>
                </View>
                <Switch value={paidFromCash} onValueChange={setPaidFromCash} disabled={moneyLocked} />
              </View>
            )}

            {/* Fecha */}
            <DatePickerInput
              locale="es"
              label="Fecha del Gasto"
              value={expenseDate}
              onChange={(date) => date && setExpenseDate(date)}
              inputMode="start"
              mode="outlined"
              style={styles.input}
              disabled={moneyLocked}
            />

            {/* Descripción */}
            <TextInput
              label="Descripción"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              mode="outlined"
              style={styles.input}
              placeholder="Describe el gasto..."
            />

            {location && (
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
            )}
          </Card.Content>
        </Card>

        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={() => goBack()}
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
            {expenseId ? "Actualizar" : "Guardar"}
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
  label: {
    marginBottom: 12,
    marginTop: 4,
    color: palette.text,
  },
  cashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  amountPreview: {
    marginBottom: 16,
    minHeight: 4,
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.warning,
  },
  lockText: {
    flex: 1,
    color: palette.text,
    lineHeight: 18,
  },
  // Envuelve a otra línea si no caben (en celular "Transferencia" se salía).
  paymentMethodsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  paymentButton: {
    flexGrow: 1,
    flexBasis: 110,
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: "transparent" as any,
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
