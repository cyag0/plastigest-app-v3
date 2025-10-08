import { useField } from "formik";
import React from "react";
import { View } from "react-native";
import { RadioButton, Text } from "react-native-paper";
import ErrorText from "../ErrorText";
import MakeForm from "./AppForm/hoc";

interface Option {
  label: string;
  value: string;
}

interface AppRadioButtonProps {
  value?: any;
  name: string;
  label?: string;
  options: Option[];
  onChange?: (value: string) => void;
}

export default function AppRadioButton(props: AppRadioButtonProps) {
  function handleChange(value: string) {
    if (props.onChange) {
      props.onChange(value);
    }
  }

  return (
    <View style={{ marginVertical: 8 }}>
      <RadioButton.Group onValueChange={handleChange} value={props.value}>
        {props.options.map((option) => (
          <RadioButton.Item
            key={option.value}
            label={option.label}
            value={option.value}
            status={props.value === option.value ? "checked" : "unchecked"}
          />
        ))}
      </RadioButton.Group>
    </View>
  );
}

export const FormRadioButton = MakeForm(AppRadioButton);
