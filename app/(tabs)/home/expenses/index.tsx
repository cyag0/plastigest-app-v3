import AppList from "@/components/App/AppList";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function ExpensesIndex() {
  const navigation = router;

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      suministros: "package-variant",
      servicios: "tools",
      transporte: "truck",
      nomina: "account-cash",
      mantenimiento: "wrench",
      marketing: "bullhorn",
      alquiler: "home",
      otros: "dots-horizontal",
    };
    return icons[category] || "cash";
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      suministros: palette.primary,
      servicios: palette.blue,
      transporte: palette.warning,
      nomina: palette.success,
      mantenimiento: palette.accent,
      marketing: palette.purple,
      alquiler: palette.secondary,
      otros: palette.textSecondary,
    };
    return colors[category] || palette.primary;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "efectivo":
        return "cash";
      case "tarjeta":
        return "credit-card";
      case "transferencia":
        return "bank-transfer";
      default:
        return "cash";
    }
  };

  return (
    <AppList
      title="Gastos"
      service={Services.expenses}
      filters={[
        {
          type: "simple",
          name: "category",
          label: "Categoría",
          options: [
            { label: "Todas", value: "" },
            { label: "Suministros", value: "suministros" },
            { label: "Servicios", value: "servicios" },
            { label: "Transporte", value: "transporte" },
            { label: "Nómina", value: "nomina" },
            { label: "Mantenimiento", value: "mantenimiento" },
            { label: "Marketing", value: "marketing" },
            { label: "Alquiler", value: "alquiler" },
            { label: "Otros", value: "otros" },
          ],
        },
        {
          type: "simple",
          name: "payment_method",
          label: "Método de Pago",
          options: [
            { label: "Todos", value: "" },
            { label: "Efectivo", value: "efectivo" },
            { label: "Tarjeta", value: "tarjeta" },
            { label: "Transferencia", value: "transferencia" },
          ],
        },
        {
          type: "dateRange",
          name: "date_range",
          label: "Rango de Fechas",
          placeholder: "Seleccionar fechas",
        },
      ]}
      onPressCreate={() => {
        navigation.push("/home/expenses/form");
      }}
      onItemPress={(entity) => {
        navigation.push(`/home/expenses/form?id=${entity.id}`);
      }}
      renderCard={({ item: expense }) => ({
        title: (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <MaterialCommunityIcons
              name={getCategoryIcon(expense.category)}
              size={20}
              color={getCategoryColor(expense.category)}
            />
            <Text variant="bodyLarge" style={{ fontWeight: "600", flex: 1 }}>
              {expense.category_label}
            </Text>
          </View>
        ),
        description: (
          <View style={{ gap: 4, marginTop: 4 }}>
            <Text
              variant="bodyMedium"
              style={{
                color: palette.text,
              }}
              numberOfLines={2}
            >
              {expense.description}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                marginTop: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialCommunityIcons
                  name={getPaymentMethodIcon(expense.payment_method)}
                  size={14}
                  color={palette.textSecondary}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  {expense.payment_method_label}
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                {new Date(expense.expense_date).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        ),
        right: (
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text
              variant="titleMedium"
              style={{
                color: palette.red,
                fontWeight: "bold",
              }}
            >
              -
              {new Intl.NumberFormat("es-MX", {
                style: "currency",
                currency: "MXN",
              }).format(expense.amount)}
            </Text>
            {expense.user && (
              <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                {expense.user.name}
              </Text>
            )}
          </View>
        ),
      })}
      menu={{
        showDelete: true,
        showEdit: true,
      }}
      searchPlaceholder="Buscar gastos..."
      defaultParams={{
        sort: "-expense_date",
      }}
    />
  );
}
