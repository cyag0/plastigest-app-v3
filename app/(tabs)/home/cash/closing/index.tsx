import { formatDate } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import AppChip from "@/components/App/Chip";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { formatMoney } from "@/utils/format";
import { shortLocationName } from "@/utils/locations";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (value: number | string) => {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `$${(n ?? 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Columns
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CashClosingIndex() {
  const alerts = useAlerts();
  const { selectedCompany } = useAuth();
  const { downloadPdfFromApi } = usePdfDownload({
    onError: (error) => alerts.error("Error al descargar el PDF: " + error.message),
  });

  const handleDownloadPdf = async (item: any) => {
    try {
      const { url } = await Services.cashClosings.pdfUrl(item.id);
      const date = (item.closing_date ?? "").split("T")[0];
      await downloadPdfFromApi(url, { fileName: `corte-caja-${date}.pdf` });
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message || "Error al generar el PDF del corte",
      );
    }
  };

  return (
    <>
      {/* Esta lista es histórica: ya nadie hace el cierre diario y vacía no
          decía por qué. */}
      <View style={styles.note}>
        <MaterialCommunityIcons name="information-outline" size={18} color={palette.info} />
        <Text style={styles.noteText}>
          El corte ahora se hace al cerrar cada turno de caja. Aquí quedan los cierres diarios de antes.
        </Text>
        <Pressable onPress={() => router.push("/(tabs)/home/cash/sessions" as any)} hitSlop={8}>
          <Text style={styles.noteLink}>Ver turnos</Text>
        </Pressable>
      </View>
    <AppList
      title="Cierres anteriores"
      emptyMessage="No hay cierres diarios anteriores."
      service={Services.cashClosings}
      columns={[
        {
          key: "closing_date",
          dataIndex: "closing_date",
          width: 100,
          title: "Fecha",
          render: (value) => formatDate(value),
        },
        {
          key: "location",
          dataIndex: "location.name",
          width: 130,
          title: "Ubicación",
          render: (value) => value ?? "—",
        },
        {
          key: "expected_balance",
          dataIndex: "expected_balance",
          width: 130,
          title: "Saldo esperado",
          render: (value) => formatCurrency(value),
        },
        {
          key: "difference",
          dataIndex: "difference",
          width: 120,
          title: "Diferencia",
          render: (value) => (value == null ? "—" : formatCurrency(value)),
        },
        {
          key: "movements_count",
          dataIndex: "movements_count",
          width: 120,
          title: "Movimientos",
          render: (value) => value ?? 0,
        },
      ]}
      // El corte ahora se hace por turno de caja; aquí solo quedan los cierres anteriores.
      showFab={false}
      menu={{
        ...generateCrudMenu("/(tabs)/home/cash/closing" as any, {
        showDelete() {
          return false;
        },
        showEdit(item) {
          return false;
        },
        customActions: [
          {
            title: "Descargar PDF",
            icon: "file-pdf-box",
            onPress: handleDownloadPdf,
          },
        ],
      }),
        onCreate: undefined,
      }}
      renderCard={({ item }: { item: any }) => {
        const diff = parseFloat(item.difference ?? "0");
        const location = item.location?.name ? shortLocationName(item.location.name, selectedCompany?.name) : null;

        return {
          title: formatDate(item.closing_date),
          // `subtitle` no existe en las tarjetas: la sucursal no se veía.
          description: [location, `${item.movements_count ?? 0} movimientos`].filter(Boolean).join(" · "),
          right: (
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ fontWeight: "700", color: palette.text }}>
                {formatCurrency(item.expected_balance ?? 0)}
              </Text>
              {item.difference != null &&
                (Math.abs(diff) < 0.005 ? (
                  <AppChip size="sm" variant="success" icon="check">
                    Cuadra
                  </AppChip>
                ) : diff < 0 ? (
                  <AppChip size="sm" variant="error">{`Faltan ${formatMoney(Math.abs(diff))}`}</AppChip>
                ) : (
                  <AppChip size="sm" variant="info">{`Sobran ${formatMoney(diff)}`}</AppChip>
                ))}
            </View>
          ),
          bottom: [
            { label: "Ingresos", value: formatCurrency(item.total_income ?? 0) },
            { label: "Egresos", value: formatCurrency(item.total_expense ?? 0) },
          ],
        };
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    marginHorizontal: tokens.spacing[4],
    marginTop: tokens.spacing[3],
    padding: tokens.spacing[3],
    borderRadius: tokens.radius.md,
    backgroundColor: palette.infoSoft,
  },
  noteText: {
    ...tokens.typography.caption,
    color: palette.text,
    flex: 1,
  },
  noteLink: {
    ...tokens.typography.caption,
    color: palette.primary,
    fontWeight: "700",
  },
});
