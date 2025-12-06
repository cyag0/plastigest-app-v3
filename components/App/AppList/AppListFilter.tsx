import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Button,
  Checkbox,
  Divider,
  IconButton,
  Modal,
  Portal,
  RadioButton,
  Text,
} from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";

export type FilterType = "simple" | "multiple" | "date" | "dateRange";

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterConfig {
  name: string;
  label: string;
  type: FilterType;
  options?: FilterOption[];
  placeholder?: string;
}

interface FilterButtonProps {
  label: string;
  value: string;
  onPress: () => void;
  active?: boolean;
}

function FilterButton({ label, value, onPress, active }: FilterButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        gap: 4,
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: active ? palette.primary + "15" : "transparent",
      }}
    >
      <Text
        variant="bodySmall"
        style={{
          opacity: 1,
          color: palette.textSecondary,
        }}
      >
        {label}:
      </Text>
      <Text
        variant="bodySmall"
        style={{
          color: active ? palette.primary : palette.error,
          fontWeight: "bold",
          opacity: 1,
        }}
      >
        {value}
      </Text>
      <MaterialCommunityIcons
        name="chevron-down"
        size={16}
        color={active ? palette.primary : palette.error}
      />
    </TouchableOpacity>
  );
}

interface FilterPopoverProps {
  visible: boolean;
  onDismiss: () => void;
  filter: FilterConfig;
  value: any;
  onApply: (value: any) => void;
}

function FilterPopover({
  visible,
  onDismiss,
  filter,
  value,
  onApply,
}: FilterPopoverProps) {
  const [tempValue, setTempValue] = useState(value);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    "from" | "to" | "single"
  >("single");

  const handleApply = () => {
    onApply(tempValue);
    onDismiss();
  };

  const handleClear = () => {
    if (filter.type === "multiple") {
      setTempValue([]);
      onApply([]);
    } else if (filter.type === "date") {
      setTempValue("");
      onApply("");
    } else if (filter.type === "dateRange") {
      setTempValue({ from: "", to: "" });
      onApply({ from: "", to: "" });
    } else {
      setTempValue("");
      onApply("");
    }
    onDismiss();
  };

  const handleSingleDateConfirm = (params: any) => {
    const date = params.date
      ? new Date(params.date).toISOString().split("T")[0]
      : "";
    setTempValue(date);
    setShowDatePicker(false);
  };

  const handleRangeDateConfirm = (params: any) => {
    const date = params.date
      ? new Date(params.date).toISOString().split("T")[0]
      : "";

    if (datePickerField === "from") {
      setTempValue({ ...tempValue, from: date });
    } else if (datePickerField === "to") {
      setTempValue({ ...tempValue, to: date });
    }

    setShowDatePicker(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.popoverContainer}
      >
        <View style={styles.popoverHeader}>
          <Text variant="titleMedium" style={styles.popoverTitle}>
            {filter.label}
          </Text>
          <IconButton
            icon="close"
            size={20}
            onPress={onDismiss}
            iconColor={palette.text}
          />
        </View>

        <Divider />

        <ScrollView style={styles.popoverContent}>
          {filter.type === "simple" && (
            <RadioButton.Group
              onValueChange={(val) => setTempValue(val)}
              value={tempValue || ""}
            >
              {filter.options?.map((option) => (
                <RadioButton.Item
                  key={option.value}
                  label={option.label}
                  value={option.value.toString()}
                  labelStyle={{ color: palette.text }}
                  color={palette.primary}
                />
              ))}
            </RadioButton.Group>
          )}

          {filter.type === "multiple" && (
            <>
              {filter.options?.map((option) => {
                const selectedValues = tempValue || [];
                return (
                  <Checkbox.Item
                    key={option.value}
                    label={option.label}
                    status={
                      selectedValues.includes(option.value)
                        ? "checked"
                        : "unchecked"
                    }
                    onPress={() => {
                      const newValues = selectedValues.includes(option.value)
                        ? selectedValues.filter((v: any) => v !== option.value)
                        : [...selectedValues, option.value];
                      setTempValue(newValues);
                    }}
                    labelStyle={{ color: palette.text }}
                    color={palette.primary}
                  />
                );
              })}
            </>
          )}

          {filter.type === "date" && (
            <View style={{ padding: 8 }}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowDatePicker(true);
                }}
                icon="calendar"
              >
                {tempValue ? formatDate(tempValue) : "Seleccionar fecha"}
              </Button>
            </View>
          )}

          {filter.type === "dateRange" && (
            <View style={{ padding: 8, gap: 12 }}>
              <View>
                <Text
                  variant="bodySmall"
                  style={{ marginBottom: 8, color: palette.textSecondary }}
                >
                  Fecha desde
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setDatePickerField("from");
                    setShowDatePicker(true);
                  }}
                  icon="calendar"
                >
                  {tempValue?.from ? formatDate(tempValue.from) : "Seleccionar"}
                </Button>
              </View>

              <View>
                <Text
                  variant="bodySmall"
                  style={{ marginBottom: 8, color: palette.textSecondary }}
                >
                  Fecha hasta
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setDatePickerField("to");
                    setShowDatePicker(true);
                  }}
                  icon="calendar"
                >
                  {tempValue?.to ? formatDate(tempValue.to) : "Seleccionar"}
                </Button>
              </View>
            </View>
          )}
        </ScrollView>

        <Divider />

        <View style={styles.popoverFooter}>
          <Button
            mode="outlined"
            onPress={handleClear}
            style={{ flex: 1 }}
            textColor={palette.textSecondary}
          >
            Limpiar
          </Button>
          <Button mode="contained" onPress={handleApply} style={{ flex: 1 }}>
            Aplicar
          </Button>
        </View>
      </Modal>

      {/* Date Picker Modal - Single Date */}
      {filter.type === "date" && (
        <DatePickerModal
          locale="es"
          mode="single"
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          date={tempValue ? new Date(tempValue) : new Date()}
          onConfirm={handleSingleDateConfirm}
        />
      )}

      {/* Date Picker Modal - Range (usando dos pickers simples) */}
      {filter.type === "dateRange" && (
        <DatePickerModal
          locale="es"
          mode="single"
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
          date={
            datePickerField === "from" && tempValue?.from
              ? new Date(tempValue.from)
              : datePickerField === "to" && tempValue?.to
              ? new Date(tempValue.to)
              : new Date()
          }
          onConfirm={handleRangeDateConfirm}
        />
      )}
    </Portal>
  );
}

interface AppListFilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

export default function AppListFilterBar({
  filters,
  values,
  onChange,
}: AppListFilterBarProps) {
  const [activeFilter, setActiveFilter] = useState<FilterConfig | null>(null);

  const getFilterDisplayValue = (filter: FilterConfig): string => {
    let value = values[filter.name];

    // Para dateRange, reconstruir el objeto desde los campos _from y _to
    if (filter.type === "dateRange") {
      value = {
        from: values[`${filter.name}_from`] || "",
        to: values[`${filter.name}_to`] || "",
      };
    }

    if (!value || (Array.isArray(value) && value.length === 0)) {
      return "Todos";
    }

    if (filter.type === "simple") {
      const option = filter.options?.find((opt) => opt.value == value);
      return option?.label || "Seleccionado";
    }

    if (filter.type === "multiple") {
      const count = value.length;
      return count === 1
        ? filter.options?.find((opt) => opt.value == value[0])?.label ||
            "1 seleccionado"
        : `${count} seleccionados`;
    }

    if (filter.type === "date") {
      if (!value) return "Todos";
      const date = new Date(value);
      return date.toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      });
    }

    if (filter.type === "dateRange") {
      if (!value?.from && !value?.to) return "Todos";
      const from = value?.from
        ? new Date(value.from).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
          })
        : "";
      const to = value?.to
        ? new Date(value.to).toLocaleDateString("es-ES", {
            month: "short",
            day: "numeric",
          })
        : "";
      if (from && to) return `${from} - ${to}`;
      if (from) return `Desde ${from}`;
      if (to) return `Hasta ${to}`;
    }

    return "Todos";
  };

  const handleFilterApply = (filterName: string, value: any) => {
    const filter = filters.find((f) => f.name === filterName);
    let newValues = { ...values };

    // Para dateRange, separar en dos campos: {name}_from y {name}_to
    if (filter?.type === "dateRange" && value && typeof value === "object") {
      delete newValues[filterName]; // Remover el campo del rango
      if (value.from) {
        newValues[`${filterName}_from`] = value.from;
      } else {
        delete newValues[`${filterName}_from`];
      }
      if (value.to) {
        newValues[`${filterName}_to`] = value.to;
      } else {
        delete newValues[`${filterName}_to`];
      }
    } else {
      newValues[filterName] = value;
    }

    onChange(newValues);
  };

  if (filters.length === 0) return null;

  return (
    <>
      <ScrollView
        horizontal
        style={{
          maxHeight: 25,
          marginVertical: 2,
          marginTop: 4,
          paddingHorizontal: 8,
        }}
        contentContainerStyle={[styles.container]}
      >
        {filters.map((filter) => {
          let hasValue = false;

          // Determinar si hay valor según el tipo de filtro
          if (filter.type === "dateRange") {
            hasValue = !!(
              values[`${filter.name}_from`] || values[`${filter.name}_to`]
            );
          } else {
            const value = values[filter.name];
            hasValue =
              value && (Array.isArray(value) ? value.length > 0 : true);
          }

          return (
            <FilterButton
              key={filter.name}
              label={filter.label}
              value={getFilterDisplayValue(filter)}
              onPress={() => setActiveFilter(filter)}
              active={hasValue}
            />
          );
        })}
      </ScrollView>

      {activeFilter && (
        <FilterPopover
          visible={!!activeFilter}
          onDismiss={() => setActiveFilter(null)}
          filter={activeFilter}
          value={
            activeFilter.type === "dateRange"
              ? {
                  from: values[`${activeFilter.name}_from`] || "",
                  to: values[`${activeFilter.name}_to`] || "",
                }
              : values[activeFilter.name]
          }
          onApply={(value) => handleFilterApply(activeFilter.name, value)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    height: "100%",
  },
  popoverContainer: {
    backgroundColor: palette.background,
    margin: 20,
    borderRadius: 12,
    maxHeight: "70%",
    minWidth: 300,
  },
  popoverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingRight: 8,
  },
  popoverTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  popoverContent: {
    padding: 8,
    maxHeight: 300,
  },
  popoverFooter: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
});
