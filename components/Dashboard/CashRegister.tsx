import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import KpiCard from "@/components/Dashboard/KpiCard";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

interface CashRegisterData {
  date: string;
  location_id: number;
  summary: {
    total_sales: number;
    sales_count: number;
    total_products: number;
    average_ticket: number;
    total_expenses: number;
    net_income: number;
  };
  payment_methods: Array<{
    method: string;
    total: number;
    percentage: number;
    expenses: number;
    net: number;
  }>;
  expenses: {
    total: number;
    count: number;
    by_category: Array<{
      category: string;
      total: number;
      count: number;
    }>;
    items: Array<{
      id: number;
      category: string;
      description: string;
      amount: number;
      payment_method: string;
      user: string;
      created_at: string;
    }>;
  };
  top_products: Array<{
    id: number;
    name: string;
    code: string;
    quantity: number;
    total: number;
  }>;
  sales_by_hour: Array<{
    hour: number;
    count: number;
    total: number;
  }>;
  sales: Array<{
    id: number;
    document_number: string;
    customer_name: string;
    payment_method: string;
    total: number;
    created_at: string;
  }>;
}

export default function CashRegister() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [data, setData] = useState<CashRegisterData | null>(null);
  const [loading, setLoading] = useState(false);
  const { selectedCompany } = useAuth();
  const { selectedLocation } = useSelectedLocation();

  useEffect(() => {
    if (selectedCompany) {
      loadCashRegister();
    }
  }, [selectedCompany, selectedDate, selectedLocation]);

  const loadCashRegister = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      const params: any = { date: dateStr };

      if (selectedLocation) {
        params.location_id = selectedLocation.id;
      }

      const response = await Services.sales.cashRegister(params);
      setData(response.data);
    } catch (error) {
      console.error("Error loading cash register:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-PE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "efectivo":
        return "cash";
      case "tarjeta":
        return "credit-card";
      case "transferencia":
        return "bank-transfer";
      default:
        return "cash-register";
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando corte de caja...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Date Selector */}
      <View style={styles.dateSelectorCard}>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={handlePreviousDay}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={24}
            color={palette.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateCenterButton}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="calendar"
            size={16}
            color={palette.primary}
          />
          <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={handleNextDay}
          disabled={selectedDate.toDateString() === new Date().toDateString()}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={
              selectedDate.toDateString() === new Date().toDateString()
                ? palette.textMuted
                : palette.textSecondary
            }
          />
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) {
              setSelectedDate(date);
            }
          }}
          maximumDate={new Date()}
        />
      )}

      {!data ? (
        <EmptyState
          icon="cash-register"
          title="No hay datos para esta fecha"
          description="Selecciona otra fecha o verifica que haya ventas registradas"
        />
      ) : (
        <>
          {/* Summary KPIs */}
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="cash-multiple"
              label="Total Ventas"
              value={formatCurrency(data.summary.total_sales)}
            />
            <KpiCard
              icon="receipt"
              label="N° Ventas"
              value={String(data.summary.sales_count)}
            />
            <KpiCard
              icon="package-variant"
              label="Productos"
              value={String(data.summary.total_products)}
            />
            <KpiCard
              icon="cash"
              label="Ticket Prom."
              value={formatCurrency(data.summary.average_ticket)}
            />
            <KpiCard
              icon="cash-minus"
              label="Total Gastos"
              value={formatCurrency(data.summary.total_expenses || 0)}
            />
          </View>

          {/* Net Income */}
          {data.summary.total_expenses > 0 && (
            <View style={[styles.netIncomeCard, { backgroundColor: palette.successSoft }]}>
              <View style={styles.netIncomeIconBox}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={24}
                  color={palette.success}
                />
              </View>
              <View style={styles.netIncomeBody}>
                <Text style={styles.netIncomeLabel}>Ingreso Neto</Text>
                <Text style={[styles.netIncomeValue, { color: palette.success }]}>
                  {formatCurrency(data.summary.net_income || 0)}
                </Text>
                <Text style={styles.netIncomeSub}>
                  Ventas: {formatCurrency(data.summary.total_sales)} - Gastos:{" "}
                  {formatCurrency(data.summary.total_expenses)}
                </Text>
              </View>
            </View>
          )}

          {/* Payment Methods */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={16}
                color={palette.textMuted}
              />
              <Text style={styles.sectionTitle}>MÉTODOS DE PAGO</Text>
            </View>
            <View style={styles.card}>
              {data.payment_methods.map((pm, index) => (
                <View
                  key={index}
                  style={[
                    styles.paymentMethodRow,
                    index < data.payment_methods.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={styles.paymentMethodLeft}>
                    <View style={styles.paymentMethodIconBox}>
                      <MaterialCommunityIcons
                        name={getPaymentMethodIcon(pm.method) as any}
                        size={18}
                        color={palette.primary}
                      />
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodText}>{pm.method}</Text>
                      {pm.expenses > 0 && (
                        <Text style={styles.paymentMethodExpenses}>
                          Gastos: -{formatCurrency(pm.expenses)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.paymentMethodRight}>
                    <Text style={styles.paymentMethodAmount}>
                      {formatCurrency(pm.total)}
                    </Text>
                    <Text style={styles.paymentMethodPercentage}>
                      {pm.percentage}%
                    </Text>
                    {pm.expenses > 0 && (
                      <Text style={styles.paymentMethodNet}>
                        Neto: {formatCurrency(pm.net)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Expenses */}
          {data.expenses && data.expenses.count > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="cash-minus"
                  size={16}
                  color={palette.textMuted}
                />
                <Text style={styles.sectionTitle}>
                  GASTOS DEL DÍA ({data.expenses.count})
                </Text>
              </View>
              <View style={styles.card}>
                {data.expenses.by_category.map((cat, index) => (
                  <View
                    key={index}
                    style={[
                      styles.expenseRow,
                      index < data.expenses.by_category.length - 1 &&
                        styles.rowDivider,
                    ]}
                  >
                    <Text style={styles.expenseCategory}>{cat.category}</Text>
                    <View style={styles.expenseRight}>
                      <Text
                        style={[
                          styles.expenseAmount,
                          { color: palette.warning },
                        ]}
                      >
                        -{formatCurrency(cat.total)}
                      </Text>
                      <Text style={styles.expenseCount}>
                        {cat.count} {cat.count === 1 ? "gasto" : "gastos"}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Top Products */}
          {data.top_products.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="star-outline"
                  size={16}
                  color={palette.textMuted}
                />
                <Text style={styles.sectionTitle}>PRODUCTOS MÁS VENDIDOS</Text>
              </View>
              <View style={styles.card}>
                {data.top_products.map((product, index) => (
                  <View
                    key={product.id}
                    style={[
                      styles.topItem,
                      index < data.top_products.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <View style={styles.topItemRank}>
                      <Text style={styles.topItemRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.topItemInfo}>
                      <Text style={styles.topItemName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <Text style={styles.topItemCode}>{product.code}</Text>
                    </View>
                    <View style={styles.topItemNumbers}>
                      <Text style={styles.topItemQty}>
                        {product.quantity} und
                      </Text>
                      <Text style={styles.topItemTotal}>
                        {formatCurrency(product.total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sales by Hour */}
          {data.sales_by_hour.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={palette.textMuted}
                />
                <Text style={styles.sectionTitle}>VENTAS POR HORA</Text>
              </View>
              <View style={styles.card}>
                {data.sales_by_hour.map((hour, index) => (
                  <View
                    key={hour.hour}
                    style={[
                      styles.hourRow,
                      index < data.sales_by_hour.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <Text style={styles.hourLabel}>
                      {hour.hour.toString().padStart(2, "0")}:00 -{" "}
                      {hour.hour.toString().padStart(2, "0")}:59
                    </Text>
                    <View style={styles.hourRight}>
                      <AppChip size="sm" variant="default">
                        {hour.count} {hour.count === 1 ? "venta" : "ventas"}
                      </AppChip>
                      <Text style={styles.hourTotal}>
                        {formatCurrency(hour.total)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Sales List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="format-list-bulleted"
                size={16}
                color={palette.textMuted}
              />
              <Text style={styles.sectionTitle}>
                DETALLE DE VENTAS ({data.sales.length})
              </Text>
            </View>
            <View style={styles.card}>
              {data.sales.map((sale, index) => (
                <View
                  key={sale.id}
                  style={[
                    styles.saleRow,
                    index < data.sales.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleCustomer} numberOfLines={1}>
                      {sale.customer_name}
                    </Text>
                    <Text style={styles.saleDocNum}>
                      #{sale.document_number || sale.id}
                    </Text>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleTotal}>
                      {formatCurrency(sale.total)}
                    </Text>
                    <Text style={styles.saleTime}>{sale.created_at}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: tokens.spacing[5],
    gap: tokens.spacing[5],
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
    gap: tokens.spacing[3],
  },
  loadingText: {
    ...tokens.typography.body,
    color: palette.textSecondary,
  },

  // --- Date selector ---
  dateSelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: tokens.spacing[2],
    gap: tokens.spacing[2],
    ...tokens.shadow.sm,
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCenterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing[2],
    paddingVertical: tokens.spacing[2],
  },
  dateLabel: {
    ...tokens.typography.bodyMd,
    color: palette.text,
  },

  // --- KPI grid ---
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[3],
  },

  // --- Net Income card ---
  netIncomeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: palette.success,
  },
  netIncomeIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  netIncomeBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  netIncomeLabel: {
    ...tokens.typography.body,
    color: palette.textSecondary,
  },
  netIncomeValue: {
    ...tokens.typography.h2,
    fontVariant: ["tabular-nums"],
  },
  netIncomeSub: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },

  // --- Section ---
  section: {
    gap: tokens.spacing[3],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    paddingTop: tokens.spacing[2],
  },
  sectionTitle: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    ...tokens.shadow.sm,
    overflow: "hidden",
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },

  // --- Payment methods ---
  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    flex: 1,
    minWidth: 0,
  },
  paymentMethodIconBox: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  paymentMethodInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  paymentMethodText: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  paymentMethodExpenses: {
    ...tokens.typography.micro,
    color: palette.warning,
  },
  paymentMethodRight: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  paymentMethodAmount: {
    ...tokens.typography.bodyMd,
    color: palette.success,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  paymentMethodPercentage: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  paymentMethodNet: {
    ...tokens.typography.caption,
    color: palette.success,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },

  // --- Expenses ---
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
  },
  expenseCategory: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  expenseRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  expenseAmount: {
    ...tokens.typography.bodyMd,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  expenseCount: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },

  // --- Top products ---
  topItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
  },
  topItemRank: {
    width: 28,
    height: 28,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  topItemRankText: {
    ...tokens.typography.micro,
    color: palette.primary,
    fontWeight: "700",
  },
  topItemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  topItemName: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  topItemCode: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  topItemNumbers: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  topItemQty: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
  },
  topItemTotal: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // --- Sales by hour ---
  hourRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  hourLabel: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  hourRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  hourTotal: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },

  // --- Sales list ---
  saleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  saleInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  saleCustomer: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  saleDocNum: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  saleRight: {
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  saleTotal: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  saleTime: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
});
