import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import React from "react";
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

const paperTheme = {
  colors: {
    primary: palette.primary,
    onSurface: palette.text,
    onSurfaceVariant: palette.textSecondary,
    surface: palette.surface,
  },
};

export default function AppCheckBox(props: AppCheckBoxProps) {
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
        color={palette.primary}
        labelStyle={styles.label}
      />
    </View>
  );
}

const styles = {
  container: {
    marginVertical: tokens.spacing[2],
  },
  label: {
    ...tokens.typography.body,
    color: palette.text,
    textAlign: "left" as const,
  },
};

export const FormCheckBox = MakeForm(AppCheckBox, {
  label: false,
});
