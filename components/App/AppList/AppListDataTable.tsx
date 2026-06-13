import palette from "@/constants/palette";
import * as React from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export type AppListColumn<T> = {
  title: React.ReactNode;
  dataIndex?: keyof T | string;
  key?: string;
  width?: number;
  align?: "left" | "center" | "right";
  render?: (value: any, record: T, index: number) => React.ReactNode;
};

interface AppListDataTableProps<T extends { id: number | string }> {
  data: T[];
  columns: AppListColumn<T>[];
  actionColumnTitle?: React.ReactNode;
  actionColumnWidth?: number;
  renderActionsCell: (item: T, index: number) => React.ReactNode;
  onRowPress?: (item: T) => void;
}

const DEFAULT_COLUMN_WIDTH = 180;
const DEFAULT_ACTION_COLUMN_WIDTH = 220;

function getValueByPath<T>(record: T, dataIndex?: keyof T | string) {
  if (!dataIndex) return undefined;

  if (typeof dataIndex !== "string") {
    return (record as any)[dataIndex];
  }

  if (!dataIndex.includes(".")) {
    return (record as any)[dataIndex];
  }

  return dataIndex
    .split(".")
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), record as any);
}

function renderCellValue(value: any) {
  if (React.isValidElement(value)) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return <Text style={styles.cellText}>-</Text>;
  }

  return (
    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cellText}>
      {String(value)}
    </Text>
  );
}

function getCellAlignment(align: AppListColumn<any>["align"]) {
  if (align === "right") return "flex-end";
  if (align === "center") return "center";
  return "flex-start";
}

export default function AppListDataTable<T extends { id: number | string }>({
  data,
  columns,
  actionColumnTitle = "Acciones",
  actionColumnWidth = DEFAULT_ACTION_COLUMN_WIDTH,
  renderActionsCell,
  onRowPress,
}: AppListDataTableProps<T>) {
  const [containerWidth, setContainerWidth] = React.useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const totalColumnsWidth = columns.reduce(
    (acc, column) => acc + (column.width || DEFAULT_COLUMN_WIDTH),
    0,
  );
  const totalWidth = totalColumnsWidth + actionColumnWidth;

  // Cuando el contenido cabe en pantalla, escalar columnas para llenar el ancho.
  const scaleFactor =
    containerWidth > 0 && totalWidth < containerWidth
      ? containerWidth / totalWidth
      : 1;

  const colWidth = (col: AppListColumn<any>) =>
    Math.floor((col.width || DEFAULT_COLUMN_WIDTH) * scaleFactor);
  const actWidth = Math.floor(actionColumnWidth * scaleFactor);
  const effectiveColumnsWidth = columns.reduce((acc, col) => acc + colWidth(col), 0);
  const effectiveTotal = effectiveColumnsWidth + actWidth;

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={[styles.tableLayout, { minWidth: totalWidth, width: effectiveTotal || totalWidth }]}
      >
        {/* Tabla principal (columnas) */}
        <View style={styles.mainTable}>
          <View style={[styles.headerRow, { width: effectiveColumnsWidth }]}>
            {columns.map((column, columnIndex) => (
              <View
                key={column.key || String(column.dataIndex || columnIndex)}
                style={[
                  styles.headerCell,
                  { width: colWidth(column) },
                ]}
              >
                <Text numberOfLines={1} style={styles.headerText}>
                  {column.title}
                </Text>
              </View>
            ))}
          </View>

          {data.map((item, rowIndex) => (
            <View
              key={String(item.id)}
              style={[
                styles.dataRow,
                { width: effectiveColumnsWidth },
                onRowPress ? styles.rowPressable : null,
              ]}
              onTouchEnd={onRowPress ? () => onRowPress(item) : undefined}
            >
              {columns.map((column, columnIndex) => {
                const value = getValueByPath(item, column.dataIndex);
                const rendered = column.render
                  ? column.render(value, item, rowIndex)
                  : value;

                return (
                  <View
                    key={
                      (column.key ||
                        String(column.dataIndex || columnIndex)) +
                      "-" +
                      String(item.id)
                    }
                    style={[
                      styles.dataCell,
                      { width: colWidth(column) },
                      { alignItems: getCellAlignment(column.align) as any },
                    ]}
                  >
                    {renderCellValue(rendered)}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Columna de Acciones (siempre visible, alineada con las filas) */}
        <View
          style={[styles.actionsColumn, { width: actWidth }]}
        >
          <View
            style={[
              styles.headerRow,
              styles.actionsHeader,
              { width: actWidth },
            ]}
          >
            <View style={[styles.headerCell, { width: actWidth }]}>
              <Text numberOfLines={1} style={styles.headerText}>
                {actionColumnTitle}
              </Text>
            </View>
          </View>

          {data.map((item, rowIndex) => (
            <View
              key={`actions-${item.id}`}
              style={[styles.dataRow, { width: actWidth }]}
            >
              <View
                style={[styles.dataCell, { width: actWidth }]}
              >
                <View style={styles.actionsCell}>
                  {renderActionsCell(item, rowIndex)}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: palette.background,
  },
  tableLayout: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  mainTable: {
    flexDirection: "column",
  },
  mainTableScrollContent: {
    minWidth: "100%",
  },
  actionsColumn: {
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    backgroundColor: palette.background,
    flexDirection: "column",
  },
  actionsHeader: {
    borderLeftWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    height: 48,
    alignItems: "center",
  },
  headerCell: {
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  headerText: {
    color: palette.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  dataRow: {
    flexDirection: "row",
    minHeight: 56,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.background,
  },
  rowPressable: {
    // placeholder para que quede explícito que se puede presionar
  },
  dataCell: {
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  cellContainer: {
    width: "100%",
    justifyContent: "center",
  },
  cellText: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  actionsCell: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 2,
  },
});
