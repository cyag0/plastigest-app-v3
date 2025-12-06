import React from "react";
import { PaperSelect } from "react-native-paper-select";
import {
  ListItem,
  PaperSelectProps,
} from "react-native-paper-select/lib/typescript/interface/paperSelect.interface";
import MakeForm from "../AppForm/hoc";
import ReadonlyText from "../AppForm/ReadonlyText";

interface AppSelectProps
  extends Omit<
    PaperSelectProps,
    | "value"
    | "onChangeText"
    | "onBlur"
    | "onChange"
    | "arrayList"
    | "label"
    | "multiEnable"
    | "onSelection"
    | "selectedArrayList"
  > {
  value?: number[] | string[] | number | string;
  onChange?: (value: string[] | number[] | string | number) => void;
  onBlur?: () => void;
  data?: Array<{ value: string; label: string }>;
  multiple?: boolean;
  hideSearchBox?: boolean;
  readonly?: boolean;
}

export default function AppSelect(props: AppSelectProps) {
  const selectRef = React.useRef(null);

  const arrayList =
    props.data && props.data.length > 0
      ? props.data.map((item) => ({ _id: item.value, value: item.label }))
      : [];

  // Normalizar el valor a array para el procesamiento interno y convertir a strings
  const normalizedValue = props.multiple
    ? Array.isArray(props.value)
      ? props.value.map((v) => String(v))
      : props.value
      ? [String(props.value)]
      : []
    : Array.isArray(props.value)
    ? props.value.map((v) => String(v))
    : props.value
    ? [String(props.value)]
    : [];

  const internalValue: ListItem[] =
    normalizedValue
      .map((item) => {
        const found = props.data?.find((d) => d.value === item);
        return found
          ? ({ _id: found.value, value: found.label } as ListItem)
          : ({} as ListItem);
      })
      .filter((item) => item._id) || [];

  const internalValueString = internalValue
    .map((item) => item.value)
    .join(", ");

  function handleOnChange(value: string, listItems: ListItem[]) {
    if (props.onChange) {
      const stringValues = listItems.map((item) => item._id);

      // Detectar si el valor original era numérico para mantener el tipo
      const shouldReturnNumbers = (() => {
        if (props.value === undefined || props.value === null) return false;
        if (typeof props.value === "number") return true;
        if (Array.isArray(props.value) && props.value.length > 0) {
          return typeof props.value[0] === "number";
        }
        return false;
      })();

      // Convertir a números si es necesario
      const newValues = shouldReturnNumbers
        ? stringValues.map((v) => {
            const num = Number(v);
            return isNaN(num) ? v : num;
          })
        : stringValues;

      if (props.multiple) {
        // Para múltiple, devolver array
        props.onChange(newValues);
      } else {
        // Para individual, devolver el primer valor o undefined
        props.onChange(newValues.length > 0 ? newValues[0] : undefined);
      }
    }
  }

  if (props.readonly) {
    return <ReadonlyText text={internalValueString} />;
  }

  return (
    <PaperSelect
      // @ts-ignore
      label={undefined}
      inputRef={selectRef}
      arrayList={arrayList}
      textInputStyle={{
        height: 48,
        outlineWidth: 0,
      }}
      onSelection={(value) => {
        handleOnChange(value.text, value.selectedList);
      }}
      selectedArrayList={internalValue}
      value={internalValueString}
      multiEnable={props.multiple || false}
      hideSearchBox={props.hideSearchBox}
      textInputMode="outlined"
      textInputOutlineStyle={{
        borderWidth: 0,
        borderColor: "transparent",
        padding: 4,
      }}
    />
  );
}

export const FormSelectSimple = MakeForm(AppSelect);
