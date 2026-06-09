import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FieldArray, useFormikContext, getIn } from "formik";
import React from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Button, Card, Text } from "react-native-paper";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ColumnType = "product" | "unit" | "number" | "text" | "select";

export interface EditableTableColumn {
  key: string;
  label: string;
  type: ColumnType;
  width?: number;
  required?: boolean;
  // for "product"
  productFetchParams?: Record<string, any>;
  // for "unit"
  unitGroupedByType?: boolean;
  // for "select"
  options?: { value: string; label: string }[];
  // for "number"
  helperText?: (row: any) => string | null;
  accentColor?: string;
}

export interface EditableTableProps {
  name: string;
  label?: string;
  defaultRow: Record<string, any>;
  columns: EditableTableColumn[];
  addLabel?: string;
  emptyMessage?: string;
  highlightColor?: string;
  borderLeft?: boolean;
  // si se quiere un id-key custom para key de React
  rowKeyField?: string;
}

export default function EditableTable({
  name,
  label,
  defaultRow,
  columns,
  addLabel = "Agregar",
  emptyMessage = "Sin filas. Toca “Agregar” para comenzar.",
  highlightColor,
  borderLeft = false,
  rowKeyField = "_key",
}: EditableTableProps) {
  const { values, setFieldValue } = useFormikContext<any>();
  const rows: any[] = getIn(values, name) || [];

  const addRow = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newRow = { ...defaultRow, [rowKeyField]: `row-${Date.now()}-${Math.random()}` };
    setFieldValue(name, [...rows, newRow]);
  };

  const removeRow = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = rows.filter((_, i) => i !== index);
    setFieldValue(name, next);
  };

  const totalWidth =
    columns.reduce((acc, c) => acc + (c.width ?? 140), 0) + 60; // +60 for remove button

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <View style={styles.headerRow}>
          <Text
            variant="titleSmall"
            style={{ color: palette.text, fontWeight: "600" }}
          >
            {label}
          </Text>
          <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
            {rows.length} {rows.length === 1 ? "fila" : "filas"}
          </Text>
        </View>
      ) : null}

      <Card
        style={[
          styles.card,
          borderLeft && {
            borderLeftWidth: 4,
            borderLeftColor: highlightColor ?? palette.error,
          },
        ]}
      >
        <Card.Content style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: palette.textSecondary }}>{emptyMessage}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: totalWidth }}>
                {/* Header */}
                <View style={[styles.row, styles.headerRowTable]}>
                  {columns.map((c) => (
                    <View
                      key={c.key}
                      style={[styles.cell, { width: c.width ?? 140 }]}
                    >
                      <Text style={styles.headerCellText}>
                        {c.label}
                        {c.required ? " *" : ""}
                      </Text>
                    </View>
                  ))}
                  <View style={[styles.cell, { width: 50 }]}>
                    <Text style={styles.headerCellText}>—</Text>
                  </View>
                </View>

                {rows.map((row, index) => (
                  <View
                    key={row[rowKeyField] ?? index}
                    style={[
                      styles.row,
                      { backgroundColor: index % 2 === 0 ? "#fafaf7" : "#ffffff" },
                    ]}
                  >
                    {columns.map((c) => (
                      <View
                        key={c.key}
                        style={[styles.cell, { width: c.width ?? 140 }]}
                      >
                        {renderCell(name, index, c, row)}
                      </View>
                    ))}
                    <View style={[styles.cell, { width: 50, alignItems: "center" }]}>
                      <TouchableOpacity
                        onPress={() => removeRow(index)}
                        style={styles.removeBtn}
                        accessibilityLabel="Eliminar fila"
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={palette.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card.Content>
      </Card>

      <View style={{ marginTop: 8 }}>
        <Button
          icon="plus"
          mode="contained-tonal"
          onPress={addRow}
          buttonColor={palette.surface}
          textColor={palette.primary}
        >
          {addLabel}
        </Button>
      </View>
    </View>
  );

  function renderCell(
    fieldArrayName: string,
    index: number,
    col: EditableTableColumn,
    row: any,
  ) {
    const fieldName = `${fieldArrayName}.${index}.${col.key}`;
    if (col.type === "product") {
      return (
        <FormProSelect
          name={fieldName}
          model="products"
          fetchParams={col.productFetchParams}
          placeholder="Seleccionar producto"
          required={col.required}
          hideLabel
        />
      );
    }
    if (col.type === "unit") {
      return (
        <FormProSelect
          name={fieldName}
          model="home.unidades"
          placeholder="Unidad"
          required={col.required}
          hideLabel
        />
      );
    }
    if (col.type === "select") {
      return (
        <FormProSelect
          name={fieldName}
          model="__static__"
          options={col.options ?? []}
          placeholder="Seleccionar"
          required={col.required}
          hideLabel
        />
      );
    }
    if (col.type === "number") {
      const helper = col.helperText?.(row) ?? null;
      return (
        <View>
          <FormInput
            name={fieldName}
            placeholder="0.00"
            keyboardType="numeric"
            required={col.required}
            hideLabel
          />
          {helper ? (
            <Text
              style={{
                fontSize: 10,
                color: palette.textSecondary,
                marginTop: 2,
              }}
            >
              {helper}
            </Text>
          ) : null}
        </View>
      );
    }
    return (
      <FormInput
        name={fieldName}
        placeholder={col.label}
        required={col.required}
        hideLabel
      />
    );
  }
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 12,
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  headerRowTable: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  headerCellText: {
    fontWeight: "700",
    color: palette.text,
    fontSize: 12,
  },
  removeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
  },
});
