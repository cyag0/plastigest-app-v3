import palette from "@/constants/palette";
import * as React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { DataTable, Text } from "react-native-paper";

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
  return (
    <View style={styles.wrapper}>
      <View style={styles.tableLayout}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.mainTableScrollContent}
        >
          <DataTable>
            <DataTable.Header style={styles.headerRow}>
              {columns.map((column, columnIndex) => (
                <DataTable.Title
                  key={column.key || String(column.dataIndex || columnIndex)}
                  style={{ width: column.width || DEFAULT_COLUMN_WIDTH }}
                >
                  <Text numberOfLines={1} style={styles.headerText}>
                    {column.title}
                  </Text>
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {data.map((item, rowIndex) => (
              <DataTable.Row
                key={String(item.id)}
                style={styles.dataRow}
                onPress={onRowPress ? () => onRowPress(item) : undefined}
              >
                {columns.map((column, columnIndex) => {
                  const value = getValueByPath(item, column.dataIndex);
                  const rendered = column.render
                    ? column.render(value, item, rowIndex)
                    : value;

                  return (
                    <DataTable.Cell
                      key={
                        (column.key ||
                          String(column.dataIndex || columnIndex)) +
                        "-" +
                        String(item.id)
                      }
                      style={{ width: column.width || DEFAULT_COLUMN_WIDTH }}
                    >
                      <View
                        style={[
                          styles.cellContainer,
                          { alignItems: getCellAlignment(column.align) as any },
                        ]}
                      >
                        {renderCellValue(rendered)}
                      </View>
                    </DataTable.Cell>
                  );
                })}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>

        <View style={[styles.actionsColumn, { width: actionColumnWidth }]}>
          <DataTable>
            <DataTable.Header style={styles.headerRow}>
              <DataTable.Title style={{ width: actionColumnWidth }}>
                <Text numberOfLines={1} style={styles.headerText}>
                  {actionColumnTitle}
                </Text>
              </DataTable.Title>
            </DataTable.Header>

            {data.map((item, rowIndex) => (
              <DataTable.Row key={`actions-${item.id}`} style={styles.dataRow}>
                <DataTable.Cell style={{ width: actionColumnWidth }}>
                  <View style={styles.actionsCell}>
                    {renderActionsCell(item, rowIndex)}
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </View>
      </View>
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
  mainTableScrollContent: {
    minWidth: "100%",
  },
  actionsColumn: {
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    backgroundColor: palette.background,
  },
  headerRow: {
    backgroundColor: palette.surface,
  },
  headerText: {
    color: palette.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  dataRow: {
    minHeight: 56,
    height: 56,
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
