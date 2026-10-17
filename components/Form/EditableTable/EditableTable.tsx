import { useAppForm } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { useSelectData } from "@/components/Form/AppProSelect/context";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext, getIn } from "formik";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  ScrollView,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { FormSelectSimple } from "../AppSelect/AppSelect";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type ColumnType =
  | "product"
  | "unit"
  | "number"
  | "text"
  | "select"
  | "stock";

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
  /**
   * "product" / "unit": campo del renglón con el nombre a mostrar si el
   * catálogo no se puede cargar (p. ej. "material_name", "unit_name").
   */
  labelKey?: string;
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
  /**
   * Solo lectura: sin "Agregar" ni el bote de cada renglón. Por defecto, el
   * del formulario (AppForm en solo lectura o sin permiso para guardar).
   */
  readonly?: boolean;
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
  readonly: readonlyProp,
}: EditableTableProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { values, setFieldValue } = useFormikContext<any>();
  const formContext = useAppForm();
  // Antes la tabla de un formulario en solo lectura seguía agregando y
  // quitando renglones (no se guardaba, pero parecía editable).
  const readonly = readonlyProp ?? formContext.readonly;
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
    columns.reduce((acc, c) => acc + (c.width ?? 140), 0) + (readonly ? 0 : 60); // +60 for remove button

  return (
    <View style={{ marginBottom: 16 }}>
      {label ? (
        <View style={styles.headerRow}>
          <Text
            variant="titleSmall"
            style={{ color: colors.text, fontWeight: "600" }}
          >
            {label}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {rows.length} {rows.length === 1 ? "fila" : "filas"}
          </Text>
        </View>
      ) : null}

      <Card
        style={[
          {shadowOffset: { width: 0, height: 0 },},
          styles.card,
          borderLeft && {
            borderLeftWidth: 4,
            borderLeftColor: highlightColor ?? colors.error,
          },
        ]}
      >
        <Card.Content style={{ padding: 0 }}>
          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>
                {readonly ? "Sin renglones." : emptyMessage}
              </Text>
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
                  {!readonly && (
                    <View style={[styles.cell, { width: 50 }]}>
                      <Text style={styles.headerCellText}>—</Text>
                    </View>
                  )}
                </View>

                {rows.map((row, index) => (
                  <View
                    key={row[rowKeyField] ?? index}
                    style={[
                      styles.row,
                      { backgroundColor: index % 2 === 0 ? colors.background : colors.surface },
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
                    {!readonly && (
                      <View style={[styles.cell, { width: 50, alignItems: "center" }]}>
                        <TouchableOpacity
                          onPress={() => removeRow(index)}
                          style={styles.removeBtn}
                          accessibilityLabel="Eliminar fila"
                        >
                          <MaterialCommunityIcons
                            name="trash-can-outline"
                            size={18}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card.Content>
      </Card>

      {!readonly && (
        <View style={{ marginTop: 8 }}>
          <Button
            icon="plus"
            mode="contained-tonal"
            onPress={addRow}
            buttonColor={colors.surface}
            textColor={colors.primary}
          >
            {addLabel}
          </Button>
        </View>
      )}
    </View>
  );

  function renderCell(
    fieldArrayName: string,
    index: number,
    col: EditableTableColumn,
    row: any,
  ) {
    const fieldName = `${fieldArrayName}.${index}.${col.key}`;
    // Nombre que trae el renglón, por si el catálogo no se puede cargar.
    const labelField = col.labelKey
      ? `${fieldArrayName}.${index}.${col.labelKey}`
      : undefined;
    if (col.type === "product") {
      return (
        <FormProSelect
          name={fieldName}
          model="products"
          fetchParams={col.productFetchParams}
          placeholder="Seleccionar producto"
          selectedLabelField={labelField}
          required={col.required}
        />
      );
    }
    if (col.type === "unit") {
      const productCol = columns.find((c) => c.type === "product");
      return (
        <UnitCell
          fieldName={fieldName}
          productId={productCol ? row[productCol.key] : 0}
          productParams={productCol?.productFetchParams}
          labelField={labelField}
          required={col.required}
        />
      );
    }
    if (col.type === "stock") {
      const productCol = columns.find((c) => c.type === "product");
      const unitCol = columns.find((c) => c.type === "unit");
      const quantityCol = columns.find((c) => c.type === "number");
      return (
        <StockCell
          productId={productCol ? row[productCol.key] : 0}
          unitId={unitCol ? row[unitCol.key] : 0}
          quantity={quantityCol ? row[quantityCol.key] : 0}
          productParams={productCol?.productFetchParams}
        />
      );
    }
    if (col.type === "select") {
      return (
        <FormSelectSimple
          name={fieldName}
          data={col.options ?? []}
          placeholder="Seleccionar"
          required={col.required}
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
          />
          {helper ? (
            <Text
              style={{
                fontSize: 10,
                color: colors.textSecondary,
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
      />
    );
  }
}

/**
 * Celda de unidad que muestra únicamente las unidades coherentes con el tipo
 * de medida (masa / volumen / cantidad) del producto seleccionado en la misma
 * fila. Si la unidad elegida deja de ser compatible (o está vacía), se ajusta
 * a la unidad propia del producto.
 */
function UnitCell({
  fieldName,
  productId,
  productParams,
  labelField,
  required,
}: {
  fieldName: string;
  productId: any;
  productParams?: Record<string, any>;
  labelField?: string;
  required?: boolean;
}) {
  const { values, setFieldValue } = useFormikContext<any>();
  const selectData = useSelectData();
  const paramsKey = JSON.stringify(productParams ?? null);
  // Sin products_list el catálogo no se pide (el backend respondería 403).
  const canListProducts = useCan().can("products_list");

  // Garantizamos que el catálogo de productos esté cargado para resolver el
  // tipo de medida del producto seleccionado.
  useEffect(() => {
    if (!canListProducts) return;
    selectData.fetchData("products", productParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, canListProducts]);

  const product = useMemo(() => {
    if (!productId) return null;
    const products = selectData.getCachedData("products", productParams).data ?? [];
    return products.find((p: any) => String(p.id) === String(productId)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, paramsKey, selectData]);

  const allowedType: string | null = product?.unit?.unit_type ?? null;

  const filterItem = useMemo(() => {
    if (!allowedType) return undefined;
    return (u: any) => !u.unit_type || u.unit_type === allowedType;
  }, [allowedType]);

  // Auto-corrección: si la unidad actual no es coherente con el producto (o no
  // hay unidad), la ajustamos a la unidad propia del producto para no dejar una
  // selección inválida oculta tras el filtrado.
  const currentValue = getIn(values, fieldName);
  useEffect(() => {
    if (!product || !allowedType) return;
    const productUnitId = product.unit_id ?? product.unit?.id;
    if (!productUnitId) return;

    const units = selectData.getCachedData("home.unidades").data ?? [];
    if (units.length === 0) return; // esperar a que carguen las unidades

    const currentUnit = units.find(
      (u: any) => String(u.id) === String(currentValue),
    );
    const isCompatible = currentUnit
      ? currentUnit.unit_type === allowedType
      : false;

    if ((!currentValue || !isCompatible) && String(currentValue) !== String(productUnitId)) {
      setFieldValue(fieldName, Number(productUnitId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, allowedType, currentValue, fieldName]);

  return (
    <FormProSelect
      // El `key` fuerza el remount cuando cambia el tipo de medida permitido,
      // único caso en que FastField no propagaría el nuevo `filterItem`.
      key={`unit-${allowedType ?? "all"}`}
      name={fieldName}
      model="home.unidades"
      placeholder="Unidad"
      required={required}
      filterItem={filterItem}
      selectedLabelField={labelField}
    />
  );
}

/**
 * Celda de solo lectura que muestra el stock disponible del producto
 * seleccionado en la fila, dentro de la ubicación y compañía actuales.
 * Se actualiza cada vez que cambia el producto y advierte (en rojo) cuando la
 * cantidad solicitada supera lo disponible, siempre que la unidad de la fila
 * coincida con la unidad base del producto (para no comparar magnitudes
 * distintas, p. ej. g vs kg).
 */
function StockCell({
  productId,
  unitId,
  quantity,
  productParams,
}: {
  productId: any;
  unitId: any;
  quantity: any;
  productParams?: Record<string, any>;
}) {
  const { colors } = useTheme();
  const { companyId } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const locationId = selectedLocation?.id;
  const selectData = useSelectData();
  const paramsKey = JSON.stringify(productParams ?? null);

  const [stock, setStock] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  // Sin products_list el catálogo no se pide (el backend respondería 403).
  const canListProducts = useCan().can("products_list");

  // Catálogo de productos para resolver la unidad base del seleccionado.
  useEffect(() => {
    if (!canListProducts) return;
    selectData.fetchData("products", productParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, canListProducts]);

  const product = useMemo(() => {
    if (!productId) return null;
    const products = selectData.getCachedData("products", productParams).data ?? [];
    return products.find((p: any) => String(p.id) === String(productId)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, paramsKey, selectData]);

  useEffect(() => {
    let cancelled = false;
    if (!productId || !locationId || !companyId) {
      setStock(null);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const r = await Services.inventory.getCurrentStock({
          product_id: Number(productId),
          location_id: Number(locationId),
          company_id: Number(companyId),
        });
        const value = r?.data?.current_stock;
        if (!cancelled) setStock(value == null ? null : Number(value));
      } catch {
        if (!cancelled) setStock(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, locationId, companyId]);

  if (!productId) {
    return <Text style={{ color: colors.textSecondary, fontSize: 12 }}>—</Text>;
  }

  if (loading && stock === null) {
    return <ActivityIndicator size="small" color={colors.primary} />;
  }

  const baseUnitName: string = product?.unit?.name ?? "";
  const baseUnitId = product?.unit_id ?? product?.unit?.id;
  const sameUnit =
    baseUnitId != null && String(baseUnitId) === String(unitId);
  const qty = Number(quantity) || 0;
  const insufficient = stock !== null && sameUnit && qty > stock;

  const color =
    stock === null
      ? colors.textSecondary
      : insufficient
        ? colors.error
        : colors.success;

  return (
    <View>
      <Text style={{ color, fontWeight: "700", fontSize: 13 }}>
        {stock === null
          ? "—"
          : stock.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
        {baseUnitName ? ` ${baseUnitName}` : ""}
      </Text>
      {insufficient ? (
        <Text style={{ fontSize: 10, color: colors.error, marginTop: 2 }}>
          Stock insuficiente
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 12,
    elevation: 0,
    shadowColor: "transparent",
    borderWidth: 1,
    borderColor: c.border,
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 8,
  },
  headerRowTable: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cell: {
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  headerCellText: {
    fontWeight: "700",
    color: c.text,
    fontSize: 12,
  },
  removeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: c.errorSoft,
  },
}));
