import { ListRow } from "@/components/App/ListGroup";
import { useAppForm, useFormFieldAnchor } from "@/components/Form/AppForm/AppForm";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { useSelectData } from "@/components/Form/AppProSelect/context";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext, getIn } from "formik";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  type HostInstance,
  type LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  useWindowDimensions,
  View,
} from "react-native";
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
  /** Ancho de la columna; con más espacio, las columnas crecen en proporción. */
  width?: number;
  /** Ya no pinta asterisco: lo obligatorio es lo normal en los formularios. */
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
  /** Texto del renglón para agregar ("Agregar material"). */
  addLabel?: string;
  /** Qué agregar, mientras la tabla está vacía. */
  emptyMessage?: string;
  /** Color de la orilla izquierda con `borderLeft` (no se usa en la app). */
  highlightColor?: string;
  borderLeft?: boolean;
  // si se quiere un id-key custom para key de React
  rowKeyField?: string;
  /**
   * Solo lectura: sin "Agregar" ni la × de cada renglón. Por defecto, el
   * del formulario (AppForm en solo lectura o sin permiso para guardar).
   */
  readonly?: boolean;
}

/** Ancho de la × de cada renglón. */
const REMOVE_WIDTH = 40;
/** Por omisión, ancho de una columna sin `width`. */
const COLUMN_WIDTH = 140;
// Los campos de la tabla no llevan el margen de abajo de un campo suelto.
const CELL_FIELD = { marginBottom: 0 };
const STACKED_FIELD = { marginBottom: 12 };

/**
 * Renglones editables de un formulario (p. ej. el material de empaque de un
 * producto): una sola superficie con borde, como ListGroup, con encabezado,
 * separadores, una × por renglón y "Agregar …" al final. Si las columnas no
 * caben (el teléfono), cada renglón muestra sus campos uno debajo de otro,
 * con su etiqueta.
 */
export default function EditableTable({
  name,
  label,
  defaultRow,
  columns,
  addLabel = "Agregar",
  emptyMessage = "Todavía no hay renglones.",
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

  // Un error de la lista entera ("agrega al menos uno") también lleva aquí
  // al guardar.
  const wrapRef = useRef<HostInstance>(null);
  useFormFieldAnchor(name, wrapRef);

  // Ancho disponible: hasta medirlo, se estima con el de la ventana (la
  // columna de un formulario mide a lo más 680).
  const { width: windowWidth } = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const available = measured ?? Math.min(windowWidth - 32, 680);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== measured) setMeasured(next);
  };
  const removeWidth = readonly ? 0 : REMOVE_WIDTH;
  const tableWidth =
    columns.reduce((acc, c) => acc + (c.width ?? COLUMN_WIDTH), 0) + removeWidth;
  // Las columnas se encogen hasta un 10 %; si ni así caben, apiladas.
  const stacked = available < tableWidth * 0.9;

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

  const removeButton = (index: number, style?: object) => (
    <Pressable
      onPress={() => removeRow(index)}
      hitSlop={8}
      style={({ pressed }) => [styles.remove, style, pressed && { opacity: 0.5 }]}
      accessibilityRole="button"
      accessibilityLabel={`Quitar renglón ${index + 1}`}
    >
      <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
    </Pressable>
  );

  // Teléfono: el primer campo a todo lo ancho y los cortos (unidad,
  // cantidad) de dos en dos.
  const stackedGroups = useMemo(() => {
    const groups: EditableTableColumn[][] = [];
    let pending: EditableTableColumn | null = null;
    columns.forEach((c, i) => {
      const wide = i === 0 || c.type === "product" || c.type === "text";
      if (wide) {
        if (pending) groups.push([pending]);
        pending = null;
        groups.push([c]);
      } else if (pending) {
        groups.push([pending, c]);
        pending = null;
      } else {
        pending = c;
      }
    });
    if (pending) groups.push([pending]);
    return groups;
  }, [columns]);

  if (readonly && rows.length === 0) {
    return (
      <View ref={wrapRef} style={styles.wrap}>
        {label ? <InputLabel label={label} /> : null}
        <ReadonlyText text="" />
      </View>
    );
  }

  const divider = <View style={styles.divider} />;

  return (
    <View ref={wrapRef} style={styles.wrap}>
      {label ? <InputLabel label={label} /> : null}

      <View
        onLayout={onLayout}
        style={[
          styles.surface,
          borderLeft && {
            borderLeftWidth: 4,
            borderLeftColor: highlightColor ?? colors.error,
          },
        ]}
      >
        {rows.length === 0 ? (
          <Text style={styles.empty}>{emptyMessage}</Text>
        ) : stacked ? (
          rows.map((row, index) => (
            <React.Fragment key={row[rowKeyField] ?? index}>
              {index > 0 && divider}
              <View style={styles.stackedRow}>
                {stackedGroups.map((group) => (
                  <View key={group.map((c) => c.key).join("|")} style={styles.stackedGroup}>
                    {group.map((c) => (
                      <View key={c.key} style={styles.stackedCell}>
                        {renderCell(name, index, c, row, true)}
                      </View>
                    ))}
                  </View>
                ))}
                {!readonly && removeButton(index, styles.removeStacked)}
              </View>
            </React.Fragment>
          ))
        ) : (
          <>
            <View style={[styles.tableRow, styles.headerRow]}>
              {columns.map((c) => (
                <View key={c.key} style={[styles.cell, { flex: c.width ?? COLUMN_WIDTH }]}>
                  <Text style={styles.headerText} numberOfLines={1}>
                    {c.label}
                  </Text>
                </View>
              ))}
              {!readonly && <View style={{ width: REMOVE_WIDTH }} />}
            </View>
            {rows.map((row, index) => (
              <React.Fragment key={row[rowKeyField] ?? index}>
                {divider}
                <View style={[styles.tableRow, readonly && styles.tableRowReadonly]}>
                  {columns.map((c) => (
                    <View key={c.key} style={[styles.cell, { flex: c.width ?? COLUMN_WIDTH }]}>
                      {renderCell(name, index, c, row, false)}
                    </View>
                  ))}
                  {!readonly && removeButton(index)}
                </View>
              </React.Fragment>
            ))}
          </>
        )}

        {!readonly && (
          <>
            {divider}
            <ListRow
              icon="plus"
              iconColor={colors.primary}
              title={addLabel}
              onPress={addRow}
              chevron={false}
            />
          </>
        )}
      </View>
    </View>
  );

  function renderCell(
    fieldArrayName: string,
    index: number,
    col: EditableTableColumn,
    row: any,
    withLabel: boolean,
  ) {
    const fieldName = `${fieldArrayName}.${index}.${col.key}`;
    // En el teléfono cada campo lleva su etiqueta (no hay encabezado).
    const fieldLabel = withLabel ? col.label : undefined;
    const containerStyle = withLabel ? STACKED_FIELD : CELL_FIELD;
    // Nombre que trae el renglón, por si el catálogo no se puede cargar.
    const labelField = col.labelKey
      ? `${fieldArrayName}.${index}.${col.labelKey}`
      : undefined;
    if (col.type === "product") {
      return (
        <FormProSelect
          name={fieldName}
          label={fieldLabel}
          containerStyle={containerStyle}
          model="products"
          fetchParams={col.productFetchParams}
          placeholder="Elige un producto"
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
          label={fieldLabel}
          containerStyle={containerStyle}
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
        <View style={withLabel ? STACKED_FIELD : undefined}>
          {withLabel ? <InputLabel label={col.label} /> : null}
          <StockCell
            productId={productCol ? row[productCol.key] : 0}
            unitId={unitCol ? row[unitCol.key] : 0}
            quantity={quantityCol ? row[quantityCol.key] : 0}
            productParams={productCol?.productFetchParams}
          />
        </View>
      );
    }
    if (col.type === "select") {
      return (
        <FormSelectSimple
          name={fieldName}
          label={fieldLabel}
          containerStyle={containerStyle}
          data={col.options ?? []}
          placeholder="Elige una opción"
          required={col.required}
        />
      );
    }
    if (col.type === "number") {
      const helper = col.helperText?.(row) ?? null;
      return (
        <View style={withLabel ? STACKED_FIELD : undefined}>
          <FormInput
            name={fieldName}
            label={fieldLabel}
            containerStyle={CELL_FIELD}
            placeholder="0"
            keyboardType="decimal-pad"
            inputMode="decimal"
            required={col.required}
            accessibilityLabel={withLabel ? undefined : `${col.label}, renglón ${index + 1}`}
          />
          {helper ? <Text style={styles.cellHelper}>{helper}</Text> : null}
        </View>
      );
    }
    return (
      <FormInput
        name={fieldName}
        label={fieldLabel}
        containerStyle={containerStyle}
        required={col.required}
        accessibilityLabel={withLabel ? undefined : `${col.label}, renglón ${index + 1}`}
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
  label,
  containerStyle,
  productId,
  productParams,
  labelField,
  required,
}: {
  fieldName: string;
  label?: string;
  containerStyle?: object;
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
      // El `key` fuerza el remount cuando cambia el tipo de medida permitido:
      // el campo no vuelve a pintarse solo porque cambie una función.
      key={`unit-${allowedType ?? "all"}`}
      name={fieldName}
      label={label}
      containerStyle={containerStyle}
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
    return <Text style={{ color: colors.textMuted, fontSize: 14 }}>—</Text>;
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

  return (
    <View>
      <Text
        style={{
          color: stock === null ? colors.textMuted : insufficient ? colors.error : colors.text,
          fontWeight: "500",
          fontSize: 14,
        }}
      >
        {stock === null
          ? "—"
          : stock.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
        {baseUnitName ? ` ${baseUnitName}` : ""}
      </Text>
      {insufficient ? (
        <Text style={{ fontSize: 12, lineHeight: 16, color: colors.error, marginTop: 2 }}>
          No alcanza
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  wrap: {
    marginBottom: 18,
  },
  surface: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: c.border,
    marginLeft: 14,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: c.textSecondary,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 8,
  },
  tableRowReadonly: {
    paddingVertical: 12,
  },
  cell: {
    minWidth: 0,
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  cellHelper: {
    fontSize: 12,
    lineHeight: 16,
    color: c.textSecondary,
    marginTop: 4,
  },
  remove: {
    width: REMOVE_WIDTH,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  // En el teléfono la × va arriba a la derecha, a la altura de la etiqueta
  // (sin tapar la esquina del primer campo).
  removeStacked: {
    position: "absolute",
    top: 6,
    right: 4,
    width: 36,
    height: 28,
  },
  stackedRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 2,
  },
  stackedGroup: {
    flexDirection: "row",
    gap: 12,
  },
  stackedCell: {
    flex: 1,
    minWidth: 0,
  },
}));
