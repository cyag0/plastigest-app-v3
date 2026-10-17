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
  const { colors } = useTheme();
  const paperTheme = useInputPaperTheme();
  const styles = useThemedStyles((c) => ({
    container: {
      marginVertical: tokens.spacing[2],
    },
    input: {
      backgroundColor: c.surface,
    },
    inputContent: {
      ...tokens.typography.body,
      color: c.text,
    },
  }));

  const readonly = props.readonly || false;

  // null llega desde el backend (p. ej. un precio sin capturar): String(null)
  // mostraba "null" en pantalla.
  const formattedValue = value == null ? "" : String(value);

  return (
    <View style={styles.container}>
      {!readonly ? (
        <TextInput
          mode="outlined"
          value={formattedValue}
          onChangeText={onChange}
          onBlur={onBlur}
          error={hasError}
          theme={paperTheme}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          textColor={colors.text}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          contentStyle={styles.inputContent}
          {...restProps}
        />
      ) : (
        <ReadonlyText text={formattedValue} />
      )}
    </View>
  );
}

export const FormInput = MakeForm(AppInput);
