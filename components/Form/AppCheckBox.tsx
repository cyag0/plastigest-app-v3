import React from "react";
import { View } from "react-native";
import { Checkbox } from "react-native-paper";
import MakeForm from "./AppForm/hoc";

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
  const readonly = props.readonly || false;

  function handleChange() {
    if (props.onChange && !readonly) {
      props.onChange(!props.value);
    }
  }

  return (
    <View>
      <Checkbox.Item
        {...props}
        onPress={handleChange}
        label={props.label || props.text || "Selecciona una opción"}
        status={props.value ? "checked" : "unchecked"}
      />
    </View>
  );
}

export const FormCheckBox = MakeForm(AppCheckBox, {
  label: false,
});
