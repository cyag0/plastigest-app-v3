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

export default function AppInput(props: AppInputProps) {
  const { value = "", onChange, onBlur, hasError, ...restProps } = props;

  const readonly = props.readonly || false;

  const formattedValue = String(value);

  return (
    <View>
      {!readonly ? (
        <TextInput
          mode="outlined"
          value={formattedValue}
          onChangeText={onChange}
          onBlur={onBlur}
          error={hasError}
          {...restProps}
        />
      ) : (
        <ReadonlyText text={formattedValue} />
      )}
    </View>
  );
}

export const FormInput = MakeForm(AppInput);
