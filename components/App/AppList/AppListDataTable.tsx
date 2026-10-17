import type { Palette } from "@/constants/palette";
import { useTheme } from "@/contexts/ThemeContext";
import * as React from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type AppListColumn<T> = {
  title: React.ReactNode;
  dataIndex?: keyof T | string;
  key?: string;
  /** Ancho base: las columnas se reparten el ancho disponible en proporción. */
  width?: number;
  align?: "left" | "center" | "right";
  render?: (value: any, record: T, index: number) => React.ReactNode;
};

interface AppListDataTableProps<T extends { id: number | string }> {
  data: T[];
  columns: AppListColumn<T>[];
  /** El menú ⋮ de la fila (ver, editar, eliminar…). */
  renderActionsCell: (item: T, index: number) => React.ReactNode;
  onRowPress?: (item: T) => void;
}

const DEFAULT_COLUMN_WIDTH = 180;
/** Solo cabe el botón ⋮: las acciones van en su menú, como en las tarjetas. */
const ACTIONS_WIDTH = 52;
/**
 * Cuánto se puede encoger una columna antes de desplazar la tabla a los
 * lados (el texto se recorta con "…").
 */
const MIN_SCALE = 0.8;

function getValueByPath<T>(record: T, dataIndex?: keyof T | string) {
  if (!dataIndex) return undefined;

  if (typeof dataIndex !== "string" || !dataIndex.includes(".")) {
    return (record as any)[dataIndex];
  }

  return dataIndex
    .split(".")
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), record as any);
}

function getCellAlignment(align: AppListColumn<any>["align"]) {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

/**
 * Tabla de AppList (web en pantalla ancha). Filas blancas con divisores,
 * encabezado discreto, fila resaltada al pasar el mouse y un solo menú ⋮ por
 * fila. Las columnas llenan el ancho; si no caben, se encogen un poco y luego
 * la tabla se desplaza a los lados.
 */
export default function AppListDataTable<T extends { id: number | string }>({
  data,
  columns,
  renderActionsCell,
  onRowPress,
}: AppListDataTableProps<T>) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [containerWidth, setContainerWidth] = React.useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const baseWidth = (col: AppListColumn<any>) => col.width || DEFAULT_COLUMN_WIDTH;
  const totalBase = columns.reduce((acc, col) => acc + baseWidth(col), 0);
  // El borde de la tabla (1 px por lado) no cuenta como espacio útil.
  const available = containerWidth - 2 - ACTIONS_WIDTH;
  const scale = containerWidth > 0 ? Math.max(MIN_SCALE, available / totalBase) : 1;
  const colWidth = (col: AppListColumn<any>) => Math.floor(baseWidth(col) * scale);
  const rowWidth = columns.reduce((acc, col) => acc + colWidth(col), 0) + ACTIONS_WIDTH;

  const renderCell = (column: AppListColumn<T>, item: T, rowIndex: number) => {
    const value = getValueByPath(item, column.dataIndex);
    const rendered = column.render ? column.render(value, item, rowIndex) : value;

    // En fila: así el badge (que fija su propio alignSelf) respeta la
    // alineación de la columna.
    if (React.isValidElement(rendered)) {
      return (
        <View style={[styles.cellRow, { justifyContent: getCellAlignment(column.align) }]}>
          {rendered}
        </View>
      );
    }

    const empty = rendered === null || rendered === undefined || rendered === "";
    return (
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.cellText,
          empty && styles.cellEmpty,
          // Montos y cantidades alineados por dígito.
          column.align === "right" && styles.numeric,
        ]}
      >
        {empty ? "—" : String(rendered)}
      </Text>
    );
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: rowWidth }}>
        <View style={{ width: rowWidth }}>
          <View style={styles.headerRow}>
            {columns.map((column, columnIndex) => (
              <View
                key={column.key || String(column.dataIndex || columnIndex)}
                style={[
                  styles.cell,
                  { width: colWidth(column), alignItems: getCellAlignment(column.align) },
                ]}
              >
                <Text numberOfLines={1} style={styles.headerText}>
                  {column.title}
                </Text>
              </View>
            ))}
            <View style={{ width: ACTIONS_WIDTH }} />
          </View>

          {data.map((item, rowIndex) => (
            <Pressable
              key={String(item.id)}
              onPress={onRowPress ? () => onRowPress(item) : undefined}
              disabled={!onRowPress}
              style={(state) => [
                styles.dataRow,
                onRowPress && styles.rowPressable,
                rowIndex === data.length - 1 && styles.lastRow,
                // `hovered` solo existe en web (react-native-web).
                (state as { hovered?: boolean }).hovered && onRowPress && styles.rowHovered,
                state.pressed && onRowPress && styles.rowHovered,
              ]}
            >
              {columns.map((column, columnIndex) => (
                <View
                  key={(column.key || String(column.dataIndex || columnIndex)) + "-" + String(item.id)}
                  style={[
                    styles.cell,
                    { width: colWidth(column), alignItems: getCellAlignment(column.align) },
                  ]}
                >
                  {renderCell(column, item, rowIndex)}
                </View>
              ))}
              <View style={styles.actionsCell}>{renderActionsCell(item, rowIndex)}</View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrapper: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: c.surface,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      height: 40,
      backgroundColor: c.surfaceMuted,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    dataRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 52,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowPressable: Platform.OS === "web" ? ({ cursor: "pointer" } as object) : {},
    lastRow: {
      borderBottomWidth: 0,
    },
    rowHovered: {
      backgroundColor: c.surfaceMuted,
    },
    cell: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      justifyContent: "center",
    },
    cellRow: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "stretch",
    },
    cellText: {
      color: c.text,
      fontSize: 13,
      lineHeight: 18,
    },
    cellEmpty: {
      color: c.textMuted,
    },
    numeric: {
      fontVariant: ["tabular-nums"],
    },
    actionsCell: {
      width: ACTIONS_WIDTH,
      alignItems: "center",
      justifyContent: "center",
    },
  });
