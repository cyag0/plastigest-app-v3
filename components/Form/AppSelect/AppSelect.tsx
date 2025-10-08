import React from "react";
import { PaperSelect } from "react-native-paper-select";
import {
  ListItem,
  PaperSelectProps,
} from "react-native-paper-select/lib/typescript/interface/paperSelect.interface";
import MakeForm from "../AppForm/hoc";

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
  value?: number[] | string[];
  onChange?: (value: string[] | number[]) => void;
  onBlur?: () => void;
  data?: Array<{ value: string; label: string }>;
  multiple?: boolean;
  hideSearchBox?: boolean;
}

export default function AppSelect(props: AppSelectProps) {
  const selectRef = React.useRef(null);

  const arrayList =
    props.data && props.data.length > 0
      ? props.data.map((item) => ({ _id: item.value, value: item.label }))
      : [];

  const internalValue: ListItem[] =
    (props.value || []).map((item) => {
      const found = props.data?.find((d) => d.value === item);
      return found
        ? ({ _id: found.value, value: found.label } as ListItem)
        : ({} as ListItem);
    }) || [];

  const internalValueString = internalValue
    .map((item) => item.value)
    .join(", ");

  function handleOnChange(value: string, listItems: ListItem[]) {
    if (props.onChange) {
      const newValues = listItems.map((item) => item._id);

      props.onChange(newValues);
    }
  }

  return (
    <PaperSelect
      // @ts-ignore
      label={undefined}
      inputRef={selectRef}
      arrayList={arrayList}
      onSelection={(value) => {
        handleOnChange(value.text, value.selectedList);
      }}
      selectedArrayList={internalValue}
      value={internalValueString}
      multiEnable={props.multiple || false}
      hideSearchBox={props.hideSearchBox}
      textInputMode="outlined"
    />
  );
}

export const FormSelectSimple = MakeForm(AppSelect);
