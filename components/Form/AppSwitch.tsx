import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import React from "react";
import { View } from "react-native";
import { Switch, Text } from "react-native-paper";
import MakeForm, { InputLabel } from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";

interface AppSwitchProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  name?: string;
  label?: string;
  text?: string;
  readonly?: boolean;
  disabled?: boolean;
}

export default function AppSwitch(props: AppSwitchProps) {
  const readonly = props.readonly || false;
  const text = props.label || props.text || "Selecciona una opción";

  function handleChange(value: boolean) {
    if (props.onChange && !readonly) {
      props.onChange(value);
    }
  }

  if (readonly) {
    return (
      <View>
        <InputLabel label={text} required={false} />
        <ReadonlyText text={props.value ? "Sí" : "No"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{text}</Text>
      <Switch
        value={!!props.value}
        onValueChange={handleChange}
        color={palette.primary}
        disabled={props.disabled}
      />
    </View>
  );
}

const styles = {
  container: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginVertical: tokens.spacing[2],
    paddingVertical: tokens.spacing[1],
  },
  label: {
    ...tokens.typography.body,
    color: palette.text,
    flex: 1,
    marginRight: tokens.spacing[3],
  },
};

export const FormSwitch = MakeForm(AppSwitch, {
  label: false,
});
