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
  const { value, onChange, onBlur, hasError, ...restProps } = props;

  const readonly = props.readonly || false;

  // Show empty string when null/undefined so the placeholder is visible.
  const displayValue = value == null ? "" : String(value);

  return (
    <View>
      {!readonly ? (
        <TextInput
          mode="outlined"
          value={displayValue}
          keyboardType="numeric"
          onChangeText={(raw: string) => {
            const digits = raw.replace(/[^0-9.-]/g, "");
            if (digits === "" || digits === "." || digits === "-") {
              // Empty input — emit null so formDataUtils skips the field
              // rather than sending "NaN" which fails backend validation.
              onChange && onChange(null as any);
              return;
            }
            const n = parseFloat(digits);
            if (!isNaN(n)) {
              onChange && onChange(n);
            }
          }}
          onBlur={onBlur}
          error={hasError}
          {...restProps}
        />
      ) : (
        <ReadonlyText text={displayValue} />
      )}
    </View>
  );
}

export const FormNumeric = MakeForm(AppNumeric);
