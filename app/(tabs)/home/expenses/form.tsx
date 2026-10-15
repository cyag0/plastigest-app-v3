import { goBack } from "@/utils/navigation";
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
  const [saving, setSaving] = useState(false);

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

      setCategory(expense.category);
      setAmount(expense.amount != null ? String(expense.amount) : "");
      setPaymentMethod(expense.payment_method);
      setPaidFromCash(expense.paid_from_cash ?? true);
      setDescription(expense.description ?? "");
      setExpenseDate(parseLocalDate(expense.expense_date));
    } catch (error) {
      console.error("Error loading expense:", error);
      alerts.error("Error al cargar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Validations
    if (!category) {
      alerts.error("Selecciona una categoría");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alerts.error("Ingresa un monto válido");
      return;
    }
    if (!description) {
      alerts.error("Ingresa una descripción");
      return;
    }

    try {
      setSaving(true);

      const data = {
        category,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        paid_from_cash: paymentMethod === "efectivo" ? paidFromCash : false,
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
      alerts.error(
        error.response?.data?.message || "Error al guardar el gasto"
      );
    } finally {
      setSaving(false);
    }
  };

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
              style={styles.input}
              left={<TextInput.Icon icon="currency-usd" />}
              error={!!amount && parseFloat(amount) <= 0}
            />

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
                <Switch value={paidFromCash} onValueChange={setPaidFromCash} />
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
