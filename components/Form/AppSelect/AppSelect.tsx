import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Platform, Text, View } from "react-native";
import { TouchableRipple } from "react-native-paper";
import SelectDropdown from "react-native-select-dropdown";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MakeForm from "../AppForm/hoc";
import ReadonlyText from "../AppForm/ReadonlyText";

interface AppSelectProps {
  value?: number[] | string[] | number | string;
  onChange?: (value: string[] | number[] | string | number) => void;
  onBlur?: () => void;
  data?: { value: string; label: string }[];
  multiple?: boolean;
  hideSearchBox?: boolean;
  readonly?: boolean;
  placeholder?: string;
  disabled?: boolean;
  /** Lo inyecta el formulario: error de validación ya tocado (borde rojo). */
  hasError?: boolean;
  /** Fuera de un formulario: true (o un texto) pinta el borde rojo. */
  error?: boolean | string;
}

export default function AppSelect(props: AppSelectProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const dropdownRef = React.useRef<SelectDropdown>(null);
  // Como los campos de texto: rojo con un error de validación ya tocado
  // (antes solo salía el mensaje abajo).
  const hasError = props.hasError ?? Boolean(props.error);

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
    index: number,
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
          (v) => String(v) === selectedItem.value,
        );

        if (valueExists) {
          // Remover si ya existe
          const filtered = currentValues.filter(
            (v) => String(v) !== selectedItem.value,
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

  // Texto a mostrar en el botón (placeholder o valor seleccionado)
  const buttonText = selectedValue || props.placeholder || "Seleccionar...";
  const buttonTextColor = selectedValue
    ? colors.text
    : colors.textMuted;

  if (props.multiple) {
    return (
      <View style={styles.container}>
        <SelectDropdown
          ref={dropdownRef}
          data={props.data || []}
          onSelect={handleOnChange}
          renderButton={(selectedItem, isOpened) => (
            <View
              style={[
                styles.dropdownButton,
                // Como en los campos de texto, el rojo gana al color de abierto.
                isOpened && styles.openBorder,
                hasError && styles.errorBorder,
                props.disabled && styles.disabled,
              ]}
            >
              <Text
                style={[styles.buttonText, { color: buttonTextColor }]}
                numberOfLines={1}
              >
                {buttonText}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
            </View>
          )}
          renderItem={(item, index, isSelected) => {
            const isSelectedItem = normalizedValue === item.value;
            return (
              <View
                style={[
                  styles.dropdownItem,
                  isSelectedItem && styles.selectedItem,
                ]}
              >
                <Text
                  style={[
                    styles.itemText,
                    isSelectedItem && styles.selectedItemText,
                  ]}
                >
                  {item.label}
                </Text>
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
          <TouchableRipple onPress={() => {}}>
            <View
              style={[
                styles.dropdownButton,
                // Como en los campos de texto, el rojo gana al color de abierto.
                isOpened && styles.openBorder,
                hasError && styles.errorBorder,
                props.disabled && styles.disabled,
              ]}
            >
              <Text
                style={[styles.buttonText, { color: buttonTextColor }]}
                numberOfLines={1}
              >
                {buttonText}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
            </View>
          </TouchableRipple>
        )}
        renderItem={(item, index, isSelected) => {
          const isSelectedItem = normalizedValue === item.value;
          return (
            <View
              style={[styles.dropdownItem, isSelectedItem && styles.selectedItem]}
            >
              <Text
                style={[
                  styles.itemText,
                  isSelectedItem && styles.selectedItemText,
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        dropdownStyle={styles.dropdown}
        // Deshabilitado (cargando, sin permiso o a propósito) ya no se abre:
        // antes solo se veía gris.
        disabled={props.disabled || props.readonly || false}
        // Sin buscador va undefined, no false: la librería pasa
        // `stickyHeaderIndices={search && [0]}` a la lista y react-native-web
        // 0.21 truena con false («boolean false is not iterable») al abrirla.
        search={props.hideSearchBox ? undefined : true}
        searchInputStyle={styles.searchInput}
        searchPlaceHolder="Buscar..."
        searchPlaceHolderColor={colors.textMuted}
      />
    </View>
  );
}

export const FormSelectSimple = MakeForm(AppSelect);

const makeStyles = themedStyles((c) => ({
  container: {
    minHeight: 48,
  },

  // --- Button (the visible closed state) ---
  dropdownButton: {
    width: "100%",
    height: 48,
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: tokens.spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Mismos colores que el borde de los campos de texto (useFieldInputProps).
  errorBorder: {
    borderColor: c.error,
  },
  openBorder: {
    borderColor: c.primary,
  },
  disabled: {
    backgroundColor: c.surfaceMuted,
    opacity: 0.6,
  },
  buttonText: {
    ...tokens.typography.body,
    flex: 1,
  },
  chevron: {
    fontSize: 14,
    color: c.textSecondary,
    marginLeft: tokens.spacing[2],
  },

  // --- Dropdown panel (the open list) ---
  dropdown: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    marginTop: 4,
    ...tokens.shadow.md,
  },

  // --- Search input inside dropdown ---
  searchInput: {
    backgroundColor: c.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    borderRadius: 0,
    paddingHorizontal: tokens.spacing[3],
    color: c.text,
    // En web, sin el anillo negro del navegador (el cursor ya indica foco).
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },

  // --- Items ---
  dropdownItem: {
    width: "100%",
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  itemText: {
    ...tokens.typography.body,
    color: c.text,
  },
  // El item seleccionado usa el color primary de la app (antes era el rojo de error)
  selectedItem: {
    backgroundColor: c.primarySoft,
  },
  selectedItemText: {
    color: c.primary,
    fontWeight: "600",
  },
}));
