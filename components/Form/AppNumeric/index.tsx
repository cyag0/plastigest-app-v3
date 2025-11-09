import React from "react";
import { View } from "react-native";
import { TextInput, TextInputProps } from "react-native-paper";
import MakeForm from "../AppForm/hoc";
import ReadonlyText from "../AppForm/ReadonlyText";

interface AppInputProps
  extends Omit<
    TextInputProps,
    "value" | "onChangeText" | "onBlur" | "onChange"
  > {
  value?: number;
  onChange?: (value: number) => void;
  onBlur?: () => void;
  hasError?: boolean;
  readonly?: boolean;
}

export default function AppNumeric(props: AppInputProps) {
  const { value = 0, onChange, onBlur, hasError, ...restProps } = props;

  const readonly = props.readonly || false;

  return (
    <View>
      {!readonly ? (
        <TextInput
          mode="outlined"
          value={value.toString()}
          keyboardType="numeric"
          onChangeText={(value: string) => {
            // Quitar todo excepto dígitos, punto y guion
            let numericValue = value.replace(/[^0-9.-]/g, "");

            // Convertir a número
            const valueAsNumber = parseFloat(numericValue);

            onChange && onChange(valueAsNumber);
          }}
          onBlur={onBlur}
          error={hasError}
          {...restProps}
        />
      ) : (
        <ReadonlyText text={value.toString()} />
      )}
    </View>
  );
}

export const FormNumeric = MakeForm(AppNumeric);
