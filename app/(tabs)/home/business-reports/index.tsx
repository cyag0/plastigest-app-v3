/**
 * Reportes del negocio en PDF y Excel.
 *
 * Lo que el dueño revisa cada mes y lo que pide el contador: ventas del
 * periodo (con comparativo), inventario valorizado, mermas y ajustes, y
 * diferencias de caja por cajero. El PDF es para leer, imprimir o mandar;
 * el Excel, para que el contador sume y filtre.
 *
 * El backend arma los documentos; aquí solo se elige sucursal y periodo (o
 * fecha de corte) y se pide la URL firmada.
 */

import EmptyState from "@/components/App/EmptyState";
import AppDatePicker from "@/components/Form/AppDatePicker";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { downloadFile } from "@/utils/downloadFile";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import { ActivityIndicator, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { Button, Text } from "react-native-paper";

type ReportKey = App.Entities.BusinessReportKey;
type Format = "pdf" | "xlsx";
type PeriodKey = "this_week" | "last_week" | "this_month" | "last_month" | "custom";
type AsOfKey = "today" | "last_month_end" | "last_year_end" | "custom";

const FMT = "YYYY-MM-DD";

/** Lunes de la semana (dayjs empieza en domingo). */
const monday = (d: Dayjs) => d.subtract((d.day() + 6) % 7, "day");

function periodRange(key: PeriodKey, custom: { from: string; to: string }): { from: string; to: string } {
  const today = dayjs();
  switch (key) {
    case "this_week":
      return { from: monday(today).format(FMT), to: today.format(FMT) };
    case "last_week": {
      const start = monday(today).subtract(7, "day");
      return { from: start.format(FMT), to: start.add(6, "day").format(FMT) };
    }
    case "this_month":
      return { from: today.startOf("month").format(FMT), to: today.format(FMT) };
    case "last_month": {
      const last = today.subtract(1, "month");
      return { from: last.startOf("month").format(FMT), to: last.endOf("month").format(FMT) };
    }
    default:
      return custom;
  }
}

function asOfDate(key: AsOfKey, custom: string): string | undefined {
  const today = dayjs();
  switch (key) {
    case "last_month_end":
      return today.subtract(1, "month").endOf("month").format(FMT);
    case "last_year_end":
      return today.subtract(1, "year").endOf("year").format(FMT);
    case "custom":
      return custom || undefined;
    default:
      return undefined; // existencia actual
  }
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this_week", label: "Esta semana" },
  { key: "last_week", label: "Semana pasada" },
  { key: "this_month", label: "Este mes" },
  { key: "last_month", label: "Mes pasado" },
  { key: "custom", label: "Otro periodo" },
];

const AS_OF: { key: AsOfKey; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "last_month_end", label: "Cierre del mes pasado" },
  { key: "last_year_end", label: "Cierre del año pasado" },
  { key: "custom", label: "Otra fecha" },
];

const FILE_NAMES: Record<ReportKey, string> = {
  sales: "ventas",
  "inventory-valuation": "inventario-valorizado",
  adjustments: "mermas-ajustes",
  "cash-differences": "diferencias-caja",
};

export default function BusinessReportsScreen() {
  const { colors } = useTheme();
  const alerts = useAlerts();
  const styles = useThemedStyles(makeStyles);

  const [options, setOptions] = React.useState<App.Entities.BusinessReportOptions | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<number | "all">("all");
  const [period, setPeriod] = React.useState<PeriodKey>("last_month");
  const [custom, setCustom] = React.useState({
    from: dayjs().startOf("month").format(FMT),
    to: dayjs().format(FMT),
  });
  const [asOf, setAsOf] = React.useState<AsOfKey>("today");
  const [customAsOf, setCustomAsOf] = React.useState(dayjs().format(FMT));
  // "sales:pdf" mientras se genera ese documento.
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    Services.businessReports
      .options()
      .then(setOptions)
      .catch((e: any) =>
        setLoadError(
          e?.response?.status === 403
            ? "No tienes permiso para ver los reportes del negocio."
            : e?.response?.data?.message || "No se pudieron cargar los reportes.",
        ),
      );
  }, []);

  // Quien no ve todas las sucursales saca el reporte de la suya (la del
  // header X-Location-ID); sin una elegida el servidor responde 403.
  const needsBranch = !!options && !options.can_choose_location && !options.current_location;

  const range = periodRange(period, custom);
  const rangeLabel = `${dayjs(range.from).format("DD/MM/YYYY")} al ${dayjs(range.to).format("DD/MM/YYYY")}`;
  const asOfValue = asOfDate(asOf, customAsOf);

  const open = async (report: App.Entities.BusinessReportOptions["reports"][number], format: Format) => {
    const key = `${report.key}:${format}`;
    if (busy) return;
    if (report.input === "period" && range.from > range.to) {
      alerts.error("La fecha final no puede ser anterior a la inicial.");
      return;
    }

    // En web la pestaña se abre antes de esperar al servidor: si se abre
    // después, el navegador la toma por ventana emergente y la bloquea.
    const tab = Platform.OS === "web" && format === "pdf" ? window.open("", "_blank") : null;
    try {
      setBusy(key);
      const url = await Services.businessReports.url(report.key, {
        format,
        location_id: options?.can_choose_location ? location : undefined,
        ...(report.input === "period" ? { date_from: range.from, date_to: range.to } : { as_of: asOfValue }),
      });
      const suffix = report.input === "period" ? `${range.from}-a-${range.to}` : asOfValue ?? dayjs().format(FMT);
      const fileName = `${FILE_NAMES[report.key]}-${suffix}.${format}`;

      if (tab) {
        tab.location.href = url;
      } else {
        await downloadFile(
          url,
          fileName,
          format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
      }
    } catch (e: any) {
      tab?.close();
      const data = e?.response?.data;
      const detail = data?.errors ? (Object.values(data.errors).flat()[0] as string) : data?.message;
      alerts.error(detail || "No se pudo generar el reporte.");
    } finally {
      setBusy(null);
    }
  };

  if (loadError) {
    return (
      <View style={styles.container}>
        <EmptyState icon="file-lock-outline" title="Reportes no disponibles" description={loadError} />
      </View>
    );
  }

  if (!options) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>
        PDF para leer, imprimir o mandar; Excel para que el contador sume y filtre.
      </Text>

      <View style={styles.panel}>
        <Text style={styles.label}>Sucursal</Text>
        {options.can_choose_location ? (
          <View style={styles.chips}>
            <Chip active={location === "all"} label="Todas" onPress={() => setLocation("all")} />
            {options.locations.map((l) => (
              <Chip key={l.id} active={location === l.id} label={l.name} onPress={() => setLocation(l.id)} />
            ))}
          </View>
        ) : (
          <Text style={[styles.value, needsBranch && { color: colors.error }]}>
            {options.current_location?.name ?? "Selecciona una sucursal para sacar sus reportes."}
          </Text>
        )}

        <Text style={[styles.label, { marginTop: tokens.spacing[3] }]}>Periodo</Text>
        <View style={styles.chips}>
          {PERIODS.map((p) => (
            <Chip key={p.key} active={period === p.key} label={p.label} onPress={() => setPeriod(p.key)} />
          ))}
        </View>
        {period === "custom" ? (
          <View style={styles.dates}>
            <View style={styles.dateField}>
              <AppDatePicker label="Desde" value={custom.from} onChange={(v) => setCustom((c) => ({ ...c, from: v }))} />
            </View>
            <View style={styles.dateField}>
              <AppDatePicker label="Hasta" value={custom.to} onChange={(v) => setCustom((c) => ({ ...c, to: v }))} />
            </View>
          </View>
        ) : (
          <Text style={styles.hint}>{rangeLabel} · se compara con el periodo anterior</Text>
        )}
      </View>

      <View style={styles.grid}>
        {options.reports.map((report) => (
          <View key={report.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name={report.icon as any} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{report.title}</Text>
                <Text style={styles.cardMeta}>
                  {report.input === "period"
                    ? rangeLabel
                    : asOfValue
                      ? `Al cierre del ${dayjs(asOfValue).format("DD/MM/YYYY")}`
                      : "Existencia actual"}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDescription}>{report.description}</Text>

            {report.input === "as_of" && (
              <View style={{ marginBottom: tokens.spacing[2] }}>
                <View style={styles.chips}>
                  {AS_OF.map((a) => (
                    <Chip key={a.key} active={asOf === a.key} label={a.label} onPress={() => setAsOf(a.key)} />
                  ))}
                </View>
                {asOf === "custom" && (
                  <AppDatePicker label="Fecha de corte" value={customAsOf} onChange={(v) => setCustomAsOf(v)} />
                )}
              </View>
            )}

            <View style={styles.actions}>
              <Button
                mode="contained"
                icon="file-pdf-box"
                onPress={() => open(report, "pdf")}
                loading={busy === `${report.key}:pdf`}
                disabled={!!busy || needsBranch}
                style={styles.action}
              >
                PDF
              </Button>
              <Button
                mode="outlined"
                icon="microsoft-excel"
                onPress={() => open(report, "xlsx")}
                loading={busy === `${report.key}:xlsx`}
                disabled={!!busy || needsBranch}
                style={styles.action}
              >
                Excel
              </Button>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return {
    container: { flex: 1, backgroundColor: c.background },
    center: { alignItems: "center", justifyContent: "center" },
    content: {
      paddingHorizontal: tokens.spacing[4],
      paddingTop: tokens.spacing[4],
      paddingBottom: tokens.spacing[10],
      maxWidth: 1100,
      width: "100%",
      alignSelf: "center",
    },
    subtitle: { ...tokens.typography.bodySm, color: c.textSecondary, marginBottom: tokens.spacing[3] },
    panel: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
      ...tokens.shadow.sm,
    },
    label: { ...tokens.typography.micro, color: c.textSecondary, textTransform: "uppercase", marginBottom: tokens.spacing[2] },
    value: { ...tokens.typography.bodyMd, color: c.text },
    hint: { ...tokens.typography.caption, color: c.textMuted, marginTop: tokens.spacing[2] },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      paddingHorizontal: tokens.spacing[3],
      paddingVertical: 6,
      borderRadius: tokens.radius.full,
      backgroundColor: c.surfaceMuted,
      borderWidth: 1,
      borderColor: "transparent",
    },
    chipActive: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { ...tokens.typography.caption, color: c.textSecondary, fontWeight: "500" },
    chipTextActive: { color: c.textInverse, fontWeight: "600" },
    dates: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing[3], marginTop: tokens.spacing[1] },
    dateField: { flexGrow: 1, flexBasis: 160 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing[3] },
    // Dos por renglón en pantalla ancha (los cuatro en 2 × 2), uno en celular.
    card: {
      flexGrow: 1,
      flexBasis: "45%",
      minWidth: 290,
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      ...tokens.shadow.sm,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: tokens.spacing[3], marginBottom: tokens.spacing[2] },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: tokens.radius.md,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: { ...tokens.typography.h3, color: c.text },
    cardMeta: { ...tokens.typography.caption, color: c.textSecondary },
    cardDescription: { ...tokens.typography.bodySm, color: c.textSecondary, marginBottom: tokens.spacing[3] },
    actions: { flexDirection: "row", gap: tokens.spacing[2], marginTop: "auto" },
    action: { flex: 1 },
  };
}
