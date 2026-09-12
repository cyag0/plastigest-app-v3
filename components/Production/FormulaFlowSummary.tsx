import { useSelectData } from "@/components/Form/AppProSelect/context";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Icon, Text } from "react-native-paper";

interface FlowRow {
  product_id?: number | string;
  unit_id?: number | string;
  expected_quantity?: number | string;
}

interface Props {
  items: FlowRow[];
  outputs: FlowRow[];
}

/**
 * Resumen visual del proceso: qué entra y qué sale.
 *
 * Va arriba del formulario de fórmulas para que se lea de un vistazo lo que se
 * está capturando abajo — sobre todo ahora que un proceso entrega varios
 * productos y las tablas por sí solas no cuentan la historia.
 */
export default function FormulaFlowSummary({ items, outputs }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const selectData = useSelectData();

  // Los catálogos ya los pide EditableTable; aquí sólo los leemos del cache
  // para resolver nombre y abreviatura sin disparar peticiones extra.
  useEffect(() => {
    selectData.fetchData("home.unidades");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const units = selectData.getCachedData("home.unidades").data ?? [];
  const consumables = selectData.getCachedData("products", { is_consumable: 1 }).data ?? [];
  const producibles = selectData.getCachedData("products", { is_producible: 1 }).data ?? [];

  const describe = useMemo(() => {
    const label = (row: FlowRow, catalog: any[]) => {
      const product = catalog.find((p) => String(p.id) === String(row.product_id));
      const unit = units.find((u: any) => String(u.id) === String(row.unit_id));
      const qty = Number(row.expected_quantity) || 0;

      return {
        name: product?.name ?? "Producto sin seleccionar",
        quantity: qty.toLocaleString("es-MX", { maximumFractionDigits: 3 }),
        unit: unit?.abbreviation ?? unit?.name ?? "",
      };
    };

    return {
      inputs: items.map((r) => label(r, consumables)),
      results: outputs.map((r) => label(r, producibles)),
    };
  }, [items, outputs, consumables, producibles, units]);

  const isEmpty = describe.inputs.length === 0 && describe.results.length === 0;

  if (isEmpty) {
    return (
      <View style={styles.placeholder}>
        <Icon source="flask-empty-outline" size={22} color={colors.textMuted} />
        <Text style={styles.placeholderText}>
          Captura los ingredientes y los resultados: aquí verás el proceso
          completo.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Column
        icon="basket-outline"
        color={colors.warning}
        title="Se consume"
        rows={describe.inputs}
        emptyLabel="Sin ingredientes"
        sign="−"
      />

      <View style={styles.arrow}>
        <Icon source="arrow-down" size={18} color={colors.primary} />
      </View>

      <Column
        icon="package-variant"
        color={colors.success}
        title="Se obtiene"
        rows={describe.results}
        emptyLabel="Sin resultados"
        sign="+"
      />
    </View>
  );
}

function Column({
  icon,
  color,
  title,
  rows,
  emptyLabel,
  sign,
}: {
  icon: string;
  color: string;
  title: string;
  rows: { name: string; quantity: string; unit: string }[];
  emptyLabel: string;
  sign: string;
}) {
  const styles = useStyles();

  return (
    <View style={styles.column}>
      <View style={styles.columnHeader}>
        <Icon source={icon} size={15} color={color} />
        <Text style={[styles.columnTitle, { color }]}>{title}</Text>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        rows.map((row, i) => (
          <View key={`${title}-${i}`} style={styles.row}>
            <Text style={styles.rowName} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.rowQty, { color }]}>
              {sign}
              {row.quantity}
              {row.unit ? ` ${row.unit}` : ""}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function useStyles() {
  return useThemedStyles((colors) => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
      ...tokens.shadow.xs,
    },
    placeholder: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      backgroundColor: colors.surfaceMuted,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
    },
    placeholderText: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
      flex: 1,
    },
    column: {
      gap: tokens.spacing[1],
    },
    columnHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      marginBottom: tokens.spacing[1],
    },
    columnTitle: {
      ...tokens.typography.micro,
      textTransform: "uppercase" as const,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingVertical: 3,
    },
    rowName: {
      ...tokens.typography.bodySm,
      color: colors.text,
      flex: 1,
    },
    rowQty: {
      ...tokens.typography.bodyMd,
      fontVariant: ["tabular-nums"] as const,
    },
    empty: {
      ...tokens.typography.caption,
      color: colors.textMuted,
      paddingVertical: 3,
    },
    arrow: {
      alignItems: "center",
      paddingVertical: tokens.spacing[2],
      marginVertical: tokens.spacing[1],
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  }));
}
