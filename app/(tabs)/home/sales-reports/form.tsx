import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Text,
  TextInput,
} from "react-native-paper";

interface SalesReportsFormProps {
  id?: number;
  readonly?: boolean;
}

interface DailyStats {
  total_sales: number;
  sales_count: number;
  total_cash: number;
  total_card: number;
  total_transfer: number;
  transactions_count: number;
}

export default function SalesReportsForm(props: SalesReportsFormProps) {
  const params = useLocalSearchParams();
  const reportId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const alerts = useAlerts();

  const { location, selectedCompany } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [reportDate, setReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Form state
  const [totalSales, setTotalSales] = useState("0.00");
  const [totalCash, setTotalCash] = useState("0.00");
  const [totalCard, setTotalCard] = useState("0.00");
  const [totalTransfer, setTotalTransfer] = useState("0.00");
  const [transactionsCount, setTransactionsCount] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (reportId) {
      loadReport();
    } else {
      loadDailyStats();
    }
  }, [reportId, reportDate, location]);

  const loadReport = async () => {
    if (!reportId) return;

    try {
      setLoading(true);
      const response = await Services.salesReports.show(reportId);
      const data = response.data.data;

      setReportDate(data.report_date);
      setTotalSales(data.total_sales?.toString() || "0.00");
      setTotalCash(data.total_cash?.toString() || "0.00");
      setTotalCard(data.total_card?.toString() || "0.00");
      setTotalTransfer(data.total_transfer?.toString() || "0.00");
      setTransactionsCount(data.transactions_count?.toString() || "0");
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error loading report:", error);
      alerts.error("Error al cargar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const loadDailyStats = async () => {
    if (!location) return;

    try {
      setLoadingStats(true);
      const response = await Services.sales.cashRegister({
        date: "2025-12-10",
        location_id: location.id,
      });

      const stats = response.data;

      // Parse payment methods
      let cashTotal = 0;
      let cardTotal = 0;
      let transferTotal = 0;

      if (stats.payment_methods) {
        const cash = stats.payment_methods.find(
          (pm: any) => pm.method.toLowerCase() === "efectivo"
        );
        const card = stats.payment_methods.find(
          (pm: any) => pm.method.toLowerCase() === "tarjeta"
        );
        const transfer = stats.payment_methods.find(
          (pm: any) => pm.method.toLowerCase() === "transferencia"
        );

        cashTotal = cash?.total || 0;
        cardTotal = card?.total || 0;
        transferTotal = transfer?.total || 0;
      }

      // Set daily stats with payment methods
      setDailyStats({
        total_sales: stats.summary?.total_sales || 0,
        sales_count: stats.summary?.sales_count || 0,
        total_cash: cashTotal,
        total_card: cardTotal,
        total_transfer: transferTotal,
        transactions_count: stats.summary?.sales_count || 0,
      });

      // Auto-fill form with stats
      setTotalSales(stats.summary?.total_sales?.toFixed(2) || "0.00");
      setTransactionsCount(stats.summary?.sales_count?.toString() || "0");
      setTotalCash(cashTotal.toFixed(2));
      setTotalCard(cardTotal.toFixed(2));
      setTotalTransfer(transferTotal.toFixed(2));
    } catch (error) {
      console.error("Error loading daily stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSave = async () => {
    if (!location) {
      alerts.error("No hay ubicación seleccionada");
      return;
    }

    try {
      setSaving(true);

      const data = {
        location_id: location.id,
        report_date: reportDate,
        total_sales: parseFloat(totalSales),
        total_cash: parseFloat(totalCash),
        total_card: parseFloat(totalCard),
        total_transfer: parseFloat(totalTransfer),
        transactions_count: parseInt(transactionsCount),
        notes,
      };

      if (reportId) {
        await Services.salesReports.update(reportId, data);
        alerts.success("Reporte actualizado exitosamente");
      } else {
        await Services.salesReports.store(data);
        alerts.success("Reporte guardado exitosamente");
      }

      router.back();
    } catch (error: any) {
      console.error("Error saving report:", error);
      alerts.error(
        error.response?.data?.message || "Error al guardar el reporte"
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={{ marginTop: 16 }}>Cargando reporte...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.header}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={32}
                  color={palette.primary}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="titleLarge" style={styles.title}>
                    Reporte de Ventas
                  </Text>
                  <Text variant="bodyMedium" style={styles.subtitle}>
                    {location?.name || "Sin ubicación"}
                  </Text>
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(reportDate).toLocaleDateString("es-MX", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Daily Statistics */}
          {!reportId && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="chart-box-outline"
                    size={24}
                    color={palette.primary}
                  />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Estadísticas del Día
                  </Text>
                </View>

                {loadingStats ? (
                  <ActivityIndicator style={{ marginVertical: 20 }} />
                ) : dailyStats ? (
                  <>
                    <View style={styles.statsGrid}>
                      <View style={styles.statCard}>
                        <MaterialCommunityIcons
                          name="cash-multiple"
                          size={24}
                          color={palette.success}
                        />
                        <Text variant="bodySmall" style={styles.statLabel}>
                          Total Ventas
                        </Text>
                        <Text variant="titleLarge" style={styles.statValue}>
                          {formatCurrency(dailyStats.total_sales || 0)}
                        </Text>
                      </View>

                      <View style={styles.statCard}>
                        <MaterialCommunityIcons
                          name="receipt"
                          size={24}
                          color={palette.blue}
                        />
                        <Text variant="bodySmall" style={styles.statLabel}>
                          Transacciones
                        </Text>
                        <Text variant="titleLarge" style={styles.statValue}>
                          {dailyStats.sales_count || 0}
                        </Text>
                      </View>
                    </View>

                    <Divider style={{ marginVertical: 16 }} />

                    <Text variant="titleSmall" style={{ marginBottom: 12 }}>
                      Desglose por Método de Pago
                    </Text>

                    <View style={styles.paymentMethods}>
                      <View style={styles.paymentMethod}>
                        <MaterialCommunityIcons name="cash" size={20} />
                        <Text style={{ flex: 1, marginLeft: 8 }}>Efectivo</Text>
                        <Text variant="titleSmall">
                          {formatCurrency(dailyStats.total_cash || 0)}
                        </Text>
                      </View>
                      <View style={styles.paymentMethod}>
                        <MaterialCommunityIcons name="credit-card" size={20} />
                        <Text style={{ flex: 1, marginLeft: 8 }}>Tarjeta</Text>
                        <Text variant="titleSmall">
                          {formatCurrency(dailyStats.total_card || 0)}
                        </Text>
                      </View>
                      <View style={styles.paymentMethod}>
                        <MaterialCommunityIcons
                          name="bank-transfer"
                          size={20}
                        />
                        <Text style={{ flex: 1, marginLeft: 8 }}>
                          Transferencia
                        </Text>
                        <Text variant="titleSmall">
                          {formatCurrency(dailyStats.total_transfer || 0)}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <Text style={{ textAlign: "center", padding: 20 }}>
                    No hay ventas registradas para este día
                  </Text>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Editable Form */}
          {!props.readonly && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={24}
                    color={palette.primary}
                  />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Ajustar Montos (Opcional)
                  </Text>
                </View>

                <Text variant="bodySmall" style={styles.helpText}>
                  Si los montos no coinciden, puede ajustarlos manualmente
                </Text>

                <TextInput
                  label="Total de Ventas"
                  value={totalSales}
                  onChangeText={setTotalSales}
                  keyboardType="numeric"
                  mode="outlined"
                  left={<TextInput.Icon icon="currency-usd" />}
                  style={styles.input}
                />

                <TextInput
                  label="Número de Transacciones"
                  value={transactionsCount}
                  onChangeText={setTransactionsCount}
                  keyboardType="numeric"
                  mode="outlined"
                  left={<TextInput.Icon icon="receipt" />}
                  style={styles.input}
                />

                <Divider style={{ marginVertical: 16 }} />

                <TextInput
                  label="Total en Efectivo"
                  value={totalCash}
                  onChangeText={setTotalCash}
                  keyboardType="numeric"
                  mode="outlined"
                  left={<TextInput.Icon icon="cash" />}
                  style={styles.input}
                />

                <TextInput
                  label="Total con Tarjeta"
                  value={totalCard}
                  onChangeText={setTotalCard}
                  keyboardType="numeric"
                  mode="outlined"
                  left={<TextInput.Icon icon="credit-card" />}
                  style={styles.input}
                />

                <TextInput
                  label="Total por Transferencia"
                  value={totalTransfer}
                  onChangeText={setTotalTransfer}
                  keyboardType="numeric"
                  mode="outlined"
                  left={<TextInput.Icon icon="bank-transfer" />}
                  style={styles.input}
                />

                <Divider style={{ marginVertical: 16 }} />

                <TextInput
                  label="Notas"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  placeholder="Notas adicionales sobre el reporte..."
                  style={styles.input}
                />
              </Card.Content>
            </Card>
          )}

          {/* Readonly View */}
          {props.readonly && (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.readonlySection}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={32}
                    color={palette.success}
                  />
                  <Text variant="labelLarge" style={{ marginTop: 8 }}>
                    Total de Ventas
                  </Text>
                  <Text variant="titleLarge" style={styles.readonlyValue}>
                    {formatCurrency(parseFloat(totalSales))}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 16 }} />

                <View style={styles.readonlySection}>
                  <MaterialCommunityIcons
                    name="receipt"
                    size={32}
                    color={palette.blue}
                  />
                  <Text variant="labelLarge" style={{ marginTop: 8 }}>
                    Transacciones
                  </Text>
                  <Text variant="titleMedium" style={styles.readonlyValue}>
                    {transactionsCount}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 16 }} />

                <Text variant="titleSmall" style={{ marginBottom: 12 }}>
                  Desglose por Método de Pago
                </Text>

                <View style={styles.readonlyGrid}>
                  <View style={styles.readonlyItem}>
                    <MaterialCommunityIcons
                      name="cash"
                      size={24}
                      color={palette.primary}
                    />
                    <Text variant="bodySmall" style={{ marginTop: 8 }}>
                      Efectivo
                    </Text>
                    <Text variant="titleSmall">
                      {formatCurrency(parseFloat(totalCash))}
                    </Text>
                  </View>
                  <View style={styles.readonlyItem}>
                    <MaterialCommunityIcons
                      name="credit-card"
                      size={24}
                      color={palette.primary}
                    />
                    <Text variant="bodySmall" style={{ marginTop: 8 }}>
                      Tarjeta
                    </Text>
                    <Text variant="titleSmall">
                      {formatCurrency(parseFloat(totalCard))}
                    </Text>
                  </View>
                </View>

                <View style={[styles.readonlyItem, { marginTop: 12 }]}>
                  <MaterialCommunityIcons
                    name="bank-transfer"
                    size={24}
                    color={palette.primary}
                  />
                  <Text variant="bodySmall" style={{ marginTop: 8 }}>
                    Transferencia
                  </Text>
                  <Text variant="titleSmall">
                    {formatCurrency(parseFloat(totalTransfer))}
                  </Text>
                </View>

                {notes && (
                  <>
                    <Divider style={{ marginVertical: 16 }} />
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <MaterialCommunityIcons
                        name="note-text"
                        size={24}
                        color={palette.primary}
                      />
                      <Text variant="labelLarge" style={{ marginLeft: 8 }}>
                        Notas
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                      {notes}
                    </Text>
                  </>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Action Buttons */}
        </View>
      </ScrollView>

      {!props.readonly && (
        <View style={styles.actions}>
          <Button mode="outlined" onPress={() => router.back()}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            icon="content-save"
          >
            Guardar
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    shadowColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  date: {
    color: palette.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.primary + "10",
    borderRadius: 8,
    alignItems: "center",
  },
  statLabel: {
    marginTop: 8,
    color: palette.textSecondary,
  },
  statValue: {
    marginTop: 4,
    fontWeight: "bold",
    color: palette.primary,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  helpText: {
    color: palette.textSecondary,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  readonlySection: {
    alignItems: "center",
  },
  readonlyValue: {
    marginTop: 8,
    color: palette.primary,
    fontWeight: "bold",
  },
  readonlyGrid: {
    flexDirection: "row",
    gap: 12,
  },
  readonlyItem: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  actions: {
    flexDirection: "column",
    padding: 16,
    gap: 12,
  },
});
