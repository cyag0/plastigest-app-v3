import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import SelectDropdown from "react-native-select-dropdown";
import MakeForm from "../AppForm/hoc";
import ReadonlyText from "../AppForm/ReadonlyText";

interface AppSelectProps {
  value?: number[] | string[] | number | string;
  onChange?: (value: string[] | number[] | string | number) => void;
  onBlur?: () => void;
  data?: Array<{ value: string; label: string }>;
  multiple?: boolean;
  hideSearchBox?: boolean;
  readonly?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function AppSelect(props: AppSelectProps) {
  const dropdownRef = React.useRef<SelectDropdown>(null);

  console.log("AppSelect props.value", props);

  // Normalizar el valor para el procesamiento interno
  const normalizedValue = props.multiple
    ? Array.isArray(props.value)
      ? props.value.map((v) => String(v))
      : props.value
      ? [String(props.value)]
      : []
    : Array.isArray(props.value)
    ? props.value.map((v) => String(v))[0]
    : props.value
    ? String(props.value)
    : undefined;

  // Para múltiple, obtener los elementos seleccionados
  const selectedItems =
    props.multiple && Array.isArray(normalizedValue)
      ? props.data?.filter((item) => normalizedValue.includes(item.value)) || []
      : [];

  const selectedValue = props.multiple
    ? selectedItems.map((item) => item.label).join(", ")
    : props.data?.find((item) => item.value === normalizedValue)?.label || "";

  function handleOnChange(
    selectedItem: { value: string; label: string },
    index: number
  ) {
    if (props.onChange) {
      // Detectar si el valor original era numérico para mantener el tipo
      const shouldReturnNumbers = (() => {
        if (props.value === undefined || props.value === null) return false;
        if (typeof props.value === "number") return true;
        if (Array.isArray(props.value) && props.value.length > 0) {
          return typeof props.value[0] === "number";
        }
        return false;
      })();

      // Convertir a números si es necesario
      const newValue = shouldReturnNumbers
        ? isNaN(Number(selectedItem.value))
          ? selectedItem.value
          : Number(selectedItem.value)
        : selectedItem.value;

      if (props.multiple) {
        // Para múltiple, manejar array (nota: react-native-select-dropdown no soporta múltiple nativamente)
        // Esta es una implementación simplificada
        const currentValues = Array.isArray(props.value) ? props.value : [];
        const valueExists = currentValues.some(
          (v) => String(v) === selectedItem.value
        );

        if (valueExists) {
          // Remover si ya existe
          const filtered = currentValues.filter(
            (v) => String(v) !== selectedItem.value
          );
          props.onChange(filtered as string[] | number[]);
        } else {
          // Agregar si no existe
          props.onChange([...currentValues, newValue] as string[] | number[]);
        }
      } else {
        // Para individual, devolver el valor
        props.onChange(newValue);
      }
    }
  }

  if (props.readonly) {
    return <ReadonlyText text={selectedValue} />;
  }

  if (props.multiple) {
    // Para múltiple, mostrar una vista simplificada por ahora
    return (
      <View style={styles.container}>
        <SelectDropdown
          ref={dropdownRef}
          data={props.data || []}
          onSelect={handleOnChange}
          renderButton={(selectedItem, isOpened) => (
            <View
              style={[styles.dropdownButton, props.disabled && styles.disabled]}
            >
              <ReadonlyText
                text={
                  selectedValue ||
                  props.placeholder ||
                  "Seleccionar opciones..."
                }
                textStyle={{
                  color: "#333",
                }}
              />
            </View>
          )}
          renderItem={(item, index, isSelected) => {
            const selectedItem = normalizedValue === item.value;

            console.log(
              "item",
              item,
              "isSelected",
              isSelected,
              "selectedItem",
              selectedItem
            );
            return (
              <View
                style={[
                  styles.dropdownItem,
                  selectedItem && styles.selectedItem,
                ]}
              >
                <ReadonlyText
                  text={item.label}
                  textStyle={{
                    color: "#333",
                  }}
                />
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
          dropdownStyle={styles.dropdown}
          disabled={props.disabled}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SelectDropdown
        ref={dropdownRef}
        data={props.data || []}
        onSelect={handleOnChange}
        renderButton={(selectedItem, isOpened) => (
          <TouchableRipple
            onPress={() => {
              console.log("Dropdown pressed");
            }}
          >
            <View
              style={[styles.dropdownButton, props.disabled && styles.disabled]}
            >
              <ReadonlyText
                textStyle={{
                  color: "#333",
                }}
                text={selectedValue || props.placeholder || "Seleccionar..."}
              />
            </View>
          </TouchableRipple>
        )}
        renderItem={(item, index, isSelected) => {
          const selectedItem = normalizedValue === item.value;

          return (
            <View
              style={[styles.dropdownItem, selectedItem && styles.selectedItem]}
            >
              <ReadonlyText
                text={item.label}
                textStyle={{
                  color: selectedItem ? "#fff" : undefined,
                }}
              />
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        dropdownStyle={styles.dropdown}
        disabled={props.readonly || false}
        search={!props.hideSearchBox}
        searchInputStyle={styles.searchInput}
        searchPlaceHolder="Buscar..."
      />
    </View>
  );
}

export const FormSelectSimple = MakeForm(AppSelect);

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
  },
  dropdownButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  disabled: {
    backgroundColor: "#e9ecef",
    opacity: 0.6,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dropdownItem: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedItem: {
    backgroundColor: palette.error,
  },
  searchInput: {
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingHorizontal: 12,
  },
});
