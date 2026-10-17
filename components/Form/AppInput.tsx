import type { Palette } from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useMemo } from "react";
import { View } from "react-native";
import { TextInput, TextInputProps } from "react-native-paper";
import MakeForm from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";

interface AppInputProps
  extends Omit<
    TextInputProps,
    "value" | "onChangeText" | "onBlur" | "onChange"
  > {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  readonly?: boolean;
}

/**
 * Tema de Paper aplicado a los inputs. Usa los tokens y la paleta
 * del nuevo diseno para que los outlined inputs de Paper se vean
 * consistentes con el resto de la app, sin cambiar el comportamiento
 * interno del componente.
 */
export function inputPaperTheme(colors: Palette) {
  return {
    colors: {
      primary: colors.primary,
      onSurfaceVariant: colors.textSecondary,
      outline: colors.border,
      surface: colors.surface,
      onSurface: colors.text,
      error: colors.error,
    },
  };
}

/** `inputPaperTheme` del tema activo, memorizado (es un prop objeto). */
export function useInputPaperTheme() {
  const { colors } = useTheme();
  return useMemo(() => inputPaperTheme(colors), [colors]);
}

export default function AppInput(props: AppInputProps) {
  // `error` (el texto de validación) no se reenvía al TextInput: pisaría a
  // hasError y marcaría en rojo campos que el usuario aún no ha tocado.
  const { value = "", onChange, onBlur, hasError, error: _error, ...restProps } = props;
  const fieldProps = useFieldInputProps({ multiline: !!restProps.multiline });

  const readonly = props.readonly || false;

  // null llega desde el backend (p. ej. un precio sin capturar): String(null)
  // mostraba "null" en pantalla.
  const formattedValue = value == null ? "" : String(value);

  return (
    <View>
      {!readonly ? (
        <TextInput
          mode="outlined"
          value={formattedValue}
          onChangeText={onChange}
          onBlur={onBlur}
          error={hasError}
          {...fieldProps}
          {...restProps}
          style={[fieldProps.style, restProps.style]}
        />
      ) : (
        <ReadonlyText text={formattedValue} />
      )}
    </View>
  );
}

/**
 * Aspecto común de los campos de texto (AppInput, AppNumeric, la fecha y el
 * teléfono): 48 de alto, esquinas de 12 y el borde del tema, como los campos
 * de los formularios nuevos (Procesos, Compras). Las áreas de texto crecen.
 */
export function useFieldInputProps({ multiline = false }: { multiline?: boolean } = {}) {
  const { colors } = useTheme();
  const theme = useInputPaperTheme();
  const styles = useThemedStyles((c) => ({
    single: { backgroundColor: c.surface, height: 48 },
    multi: { backgroundColor: c.surface, minHeight: 96 },
    content: { fontSize: 15, color: c.text },
    contentMulti: { fontSize: 15, color: c.text, paddingTop: 12, textAlignVertical: "top" },
    outline: { borderRadius: tokens.radius.md },
  }));
  return {
    theme,
    outlineColor: colors.border,
    activeOutlineColor: colors.primary,
    textColor: colors.text,
    placeholderTextColor: colors.textMuted,
    outlineStyle: styles.outline,
    style: multiline ? styles.multi : styles.single,
    contentStyle: multiline ? styles.contentMulti : styles.content,
  };
}

export const FormInput = MakeForm(AppInput);
