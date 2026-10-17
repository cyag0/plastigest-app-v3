import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
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
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: tokens.spacing[2],
      paddingVertical: tokens.spacing[1],
    },
    label: {
      ...tokens.typography.body,
      color: c.text,
      flex: 1,
      marginRight: tokens.spacing[3],
    },
  }));
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
        color={colors.primary}
        disabled={props.disabled}
      />
    </View>
  );
}

export const FormSwitch = MakeForm(AppSwitch, {
  label: false,
});
