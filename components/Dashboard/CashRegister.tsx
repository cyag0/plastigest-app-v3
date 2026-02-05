import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  DataTable,
  IconButton,
  Text,
} from "react-native-paper";

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 16 }}>Cargando corte de caja...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Date Selector */}
      <Card style={styles.dateCard}>
        <Card.Content>
          <View style={styles.dateSelector}>
            <IconButton
              icon="chevron-left"
              size={32}
              onPress={handlePreviousDay}
              iconColor={palette.primary}
            />
            <View style={styles.dateCenterContainer}>
              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                icon="calendar"
                style={styles.dateButton}
              >
                {formatDate(selectedDate)}
              </Button>
            </View>
            <IconButton
              icon="chevron-right"
              size={32}
              onPress={handleNextDay}
              iconColor={palette.primary}
              disabled={
                selectedDate.toDateString() === new Date().toDateString()
              }
            />
          </View>
        </Card.Content>
      </Card>

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
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="cash-register"
            size={64}
            color={palette.textSecondary}
          />
          <Text style={styles.emptyText}>No hay datos para esta fecha</Text>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={32}
                    color={palette.success}
                  />
                </View>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {formatCurrency(data.summary.total_sales)}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Total Ventas
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={32}
                    color={palette.primary}
                  />
                </View>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {data.summary.sales_count}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Ventas
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={32}
                    color={palette.accent}
                  />
                </View>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {data.summary.total_products}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Productos
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons
                    name="cash"
                    size={32}
                    color={palette.warning}
                  />
                </View>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {formatCurrency(data.summary.average_ticket)}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Ticket Promedio
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryIconContainer}>
                  <MaterialCommunityIcons
                    name="cash-minus"
                    size={32}
                    color={palette.red}
                  />
                </View>
                <Text variant="titleLarge" style={styles.summaryValue}>
                  {formatCurrency(data.summary.total_expenses || 0)}
                </Text>
                <Text variant="bodySmall" style={styles.summaryLabel}>
                  Total Gastos
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Net Income Card */}
          {data.summary.total_expenses > 0 && (
            <Card style={[styles.card, { backgroundColor: palette.success + "15" }]}>
              <Card.Content>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={40}
                    color={palette.success}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ color: palette.textSecondary }}>
                      Ingreso Neto
                    </Text>
                    <Text variant="headlineMedium" style={{ color: palette.success, fontWeight: "bold" }}>
                      {formatCurrency(data.summary.net_income || 0)}
                    </Text>
                    <Text variant="bodySmall" style={{ color: palette.textSecondary }}>
                      Ventas: {formatCurrency(data.summary.total_sales)} - Gastos: {formatCurrency(data.summary.total_expenses)}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Payment Methods */}
          <Card style={styles.card}>
            <Card.Title
              title="Métodos de Pago"
              left={(props) => (
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={24}
                  color={palette.primary}
                />
              )}
            />
            <Card.Content>
              {data.payment_methods.map((pm, index) => (
                <View key={index} style={styles.paymentMethodRow}>
                  <View style={styles.paymentMethodLeft}>
                    <MaterialCommunityIcons
                      name={getPaymentMethodIcon(pm.method) as any}
                      size={24}
                      color={palette.primary}
                    />
                    <View>
                      <Text style={styles.paymentMethodText}>{pm.method}</Text>
                      {pm.expenses > 0 && (
                        <Text style={{ fontSize: 12, color: palette.red }}>
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
                      ({pm.percentage}%)
                    </Text>
                    {pm.expenses > 0 && (
                      <Text style={{ fontSize: 14, color: palette.success, fontWeight: "600" }}>
                        Neto: {formatCurrency(pm.net)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>

          {/* Expenses Section */}
          {data.expenses && data.expenses.count > 0 && (
            <Card style={styles.card}>
              <Card.Title
                title={`Gastos del Día (${data.expenses.count})`}
                left={(props) => (
                  <MaterialCommunityIcons
                    name="cash-minus"
                    size={24}
                    color={palette.red}
                  />
                )}
              />
              <Card.Content>
                {/* By Category */}
                {data.expenses.by_category.map((cat, index) => (
                  <View key={index} style={styles.paymentMethodRow}>
                    <Text style={styles.paymentMethodText}>{cat.category}</Text>
                    <View style={styles.paymentMethodRight}>
                      <Text style={[styles.paymentMethodAmount, { color: palette.red }]}>
                        -{formatCurrency(cat.total)}
                      </Text>
                      <Text style={styles.paymentMethodPercentage}>
                        ({cat.count} {cat.count === 1 ? 'gasto' : 'gastos'})
                      </Text>
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Top Products */}
          {data.top_products.length > 0 && (
            <Card style={styles.card}>
              <Card.Title
                title="Productos Más Vendidos"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="star"
                    size={24}
                    color={palette.warning}
                  />
                )}
              />
              <Card.Content>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Producto</DataTable.Title>
                    <DataTable.Title numeric>Cant.</DataTable.Title>
                    <DataTable.Title numeric>Total</DataTable.Title>
                  </DataTable.Header>

                  {data.top_products.map((product) => (
                    <DataTable.Row key={product.id}>
                      <DataTable.Cell>
                        <View>
                          <Text style={styles.productName}>{product.name}</Text>
                          <Text style={styles.productCode}>{product.code}</Text>
                        </View>
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        {product.quantity}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        {formatCurrency(product.total)}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </Card.Content>
            </Card>
          )}

          {/* Sales by Hour */}
          {data.sales_by_hour.length > 0 && (
            <Card style={styles.card}>
              <Card.Title
                title="Ventas por Hora"
                left={(props) => (
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={24}
                    color={palette.accent}
                  />
                )}
              />
              <Card.Content>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Hora</DataTable.Title>
                    <DataTable.Title numeric>Ventas</DataTable.Title>
                    <DataTable.Title numeric>Total</DataTable.Title>
                  </DataTable.Header>

                  {data.sales_by_hour.map((hour) => (
                    <DataTable.Row key={hour.hour}>
                      <DataTable.Cell>
                        {hour.hour.toString().padStart(2, "0")}:00 -{" "}
                        {hour.hour.toString().padStart(2, "0")}:59
                      </DataTable.Cell>
                      <DataTable.Cell numeric>{hour.count}</DataTable.Cell>
                      <DataTable.Cell numeric>
                        {formatCurrency(hour.total)}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </Card.Content>
            </Card>
          )}

          {/* Sales List */}
          <Card style={styles.card}>
            <Card.Title
              title={`Detalle de Ventas (${data.sales.length})`}
              left={(props) => (
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={24}
                  color={palette.primary}
                />
              )}
            />
            <Card.Content>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Cliente</DataTable.Title>
                  <DataTable.Title>Hora</DataTable.Title>
                  <DataTable.Title numeric>Total</DataTable.Title>
                </DataTable.Header>

                {data.sales.map((sale) => (
                  <DataTable.Row key={sale.id}>
                    <DataTable.Cell>
                      <View>
                        <Text style={styles.customerName}>
                          {sale.customer_name}
                        </Text>
                        <Text style={styles.documentNumber}>
                          #{sale.document_number || sale.id}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell>{sale.created_at}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      {formatCurrency(sale.total)}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyContainer: {
    padding: 48,
    alignItems: "center",
    gap: 16,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 16,
  },
  dateCard: {
    margin: 16,
    backgroundColor: palette.surface,
    elevation: 2,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateCenterContainer: {
    flex: 1,
    alignItems: "center",
  },
  dateButton: {
    borderColor: palette.primary,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: palette.surface,
    elevation: 2,
  },
  summaryIconContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontWeight: "bold",
    textAlign: "center",
    color: palette.text,
  },
  summaryLabel: {
    textAlign: "center",
    color: palette.textSecondary,
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginTop: 0,
    backgroundColor: palette.surface,
    elevation: 2,
  },
  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  paymentMethodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: "500",
    color: palette.text,
  },
  paymentMethodRight: {
    alignItems: "flex-end",
  },
  paymentMethodAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: palette.success,
  },
  paymentMethodPercentage: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.text,
  },
  productCode: {
    fontSize: 12,
    color: palette.textSecondary,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.text,
  },
  documentNumber: {
    fontSize: 12,
    color: palette.textSecondary,
  },
});
