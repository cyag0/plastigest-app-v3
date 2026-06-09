import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import React from "react";
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
const paperTheme = {
  colors: {
    primary: palette.primary,
    onSurfaceVariant: palette.textSecondary,
    outline: palette.border,
    surface: palette.surface,
    onSurface: palette.text,
    error: palette.error,
  },
};

export default function AppInput(props: AppInputProps) {
  const { value = "", onChange, onBlur, hasError, ...restProps } = props;

  const readonly = props.readonly || false;

  const formattedValue = String(value);

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
          outlineColor={palette.border}
          activeOutlineColor={palette.primary}
          textColor={palette.text}
          placeholderTextColor={palette.textMuted}
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

const styles = {
  container: {
    marginVertical: tokens.spacing[2],
  },
  input: {
    backgroundColor: palette.surface,
  },
  inputContent: {
    ...tokens.typography.body,
    color: palette.text,
  },
};

export const FormInput = MakeForm(AppInput);
