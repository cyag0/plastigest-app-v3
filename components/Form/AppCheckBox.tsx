import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useMemo } from "react";
import { View } from "react-native";
import { Checkbox } from "react-native-paper";
import MakeForm, { InputLabel } from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";

interface AppCheckBoxProps
  extends Omit<React.ComponentProps<typeof Checkbox>, "status"> {
  value?: boolean;
  onChange?: (value: boolean) => void;
  name?: string;
  label?: string;
  text?: string;
  readonly?: boolean;
}

export default function AppCheckBox(props: AppCheckBoxProps) {
  const { colors } = useTheme();
  const paperTheme = useMemo(
    () => ({
      colors: {
        primary: colors.primary,
        onSurface: colors.text,
        onSurfaceVariant: colors.textSecondary,
        surface: colors.surface,
      },
    }),
    [colors],
  );
  const styles = useThemedStyles((c) => ({
    container: {
      marginVertical: tokens.spacing[2],
    },
    label: {
      ...tokens.typography.body,
      color: c.text,
      textAlign: "left",
    },
  }));
  const readonly = props.readonly || false;

  function handleChange() {
    if (props.onChange && !readonly) {
      props.onChange(!props.value);
    }
  }

  if (readonly) {
    return (
      <View>
        <InputLabel label={props.text || "Checkbox"} required={false} />
        <ReadonlyText text={props.value ? "Sí" : "No"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Checkbox.Item
        {...props}
        onPress={handleChange}
        label={props.label || props.text || "Selecciona una opción"}
        status={props.value ? "checked" : "unchecked"}
        position="leading"
        mode="android"
        theme={paperTheme}
        color={colors.primary}
        labelStyle={styles.label}
      />
    </View>
  );
}

export const FormCheckBox = MakeForm(AppCheckBox, {
  label: false,
});
