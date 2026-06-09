import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
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

const paperTheme = {
  colors: {
    primary: palette.primary,
    onSurface: palette.text,
    onSurfaceVariant: palette.textSecondary,
    surface: palette.surface,
  },
};

export default function AppRadioButton(props: AppRadioButtonProps) {
  function handleChange(value: string) {
    if (props.onChange) {
      props.onChange(value);
    }
  }

  return (
    <View style={styles.container}>
      <RadioButton.Group onValueChange={handleChange} value={props.value}>
        {props.options.map((option) => (
          <RadioButton.Item
            key={option.value}
            label={option.label}
            value={option.value}
            status={props.value === option.value ? "checked" : "unchecked"}
            position="leading"
            mode="android"
            theme={paperTheme}
            color={palette.primary}
            labelStyle={styles.label}
          />
        ))}
      </RadioButton.Group>
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

export const FormRadioButton = MakeForm(AppRadioButton);
