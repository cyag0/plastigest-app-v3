import { useTheme } from "@/contexts/ThemeContext";
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
import { toLocalDateString, formatDate, parseLocalDate } from "@/utils/dates";

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
  // Colores del tema: con la paleta fija el texto no se leía en modo oscuro.
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        gap: 4,
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 0,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: "400",
          opacity: 0.7,
        }}
      >
        {label}:
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontWeight: "500",
          fontSize: 11,
          opacity: 0.8,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          marginLeft: 4,
          marginRight: 8,
          opacity: 0.5,
        }}
      >
        •
      </Text>
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
  const { colors } = useTheme();
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
      ? toLocalDateString(new Date(params.date))
      : "";
    setTempValue(date);
    setShowDatePicker(false);
  };

  const handleRangeDateConfirm = (params: any) => {
    const date = params.date
      ? toLocalDateString(new Date(params.date))
      : "";

    if (datePickerField === "from") {
      setTempValue({ ...tempValue, from: date });
    } else if (datePickerField === "to") {
      setTempValue({ ...tempValue, to: date });
    }

    setShowDatePicker(false);
  };

  

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.popoverContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.popoverHeader}>
          <Text variant="titleMedium" style={[styles.popoverTitle, { color: colors.text }]}>
            {filter.label}
          </Text>
          <IconButton
            icon="close"
            size={20}
            onPress={onDismiss}
            iconColor={colors.text}
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
                  labelStyle={{ color: colors.text }}
                  color={colors.primary}
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
                    labelStyle={{ color: colors.text }}
                    color={colors.primary}
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
                  style={{ marginBottom: 8, color: colors.textSecondary }}
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
                  style={{ marginBottom: 8, color: colors.textSecondary }}
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
            textColor={colors.textSecondary}
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
          date={tempValue ? parseLocalDate(tempValue) : new Date()}
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
              ? parseLocalDate(tempValue.from)
              : datePickerField === "to" && tempValue?.to
              ? parseLocalDate(tempValue.to)
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
      return dayLabel(value);
    }

    if (filter.type === "dateRange") {
      if (!value?.from && !value?.to) return "Todos";
      const from = value?.from ? dayLabel(value.from) : "";
      const to = value?.to ? dayLabel(value.to) : "";
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
        showsHorizontalScrollIndicator={false}
        style={{
          minHeight: 24,
          maxHeight: 28,
          marginVertical: 0,
          marginBottom: 8,
          paddingHorizontal: 16,
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
            // Un filtro tiene valor activo si está definido y no es vacío o "Todos"
            hasValue =
              value !== undefined &&
              value !== null &&
              value !== "" &&
              (!Array.isArray(value) || value.length > 0);
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
    gap: 0,
    alignItems: "center",
    paddingVertical: 0,
  },
  popoverContainer: {
    margin: 20,
    borderRadius: 12,
    maxHeight: "70%",
    minWidth: 300,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center"
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

/** "17 sep": el valor del filtro es YYYY-MM-DD, se lee como fecha local. */
function dayLabel(value: string) {
  return parseLocalDate(value).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });
}
