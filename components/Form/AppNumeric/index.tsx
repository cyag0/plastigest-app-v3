import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { TextInput, TextInputProps } from "react-native-paper";
import MakeForm from "../AppForm/hoc";
import ReadonlyText from "../AppForm/ReadonlyText";
import { useFieldInputProps } from "../AppInput";

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

/** Número a partir de lo escrito; null si todavía no es un número ("", "-", "."). */
function toNumber(text: string): number | null {
  if (text === "" || text === "-" || text === "." || text === "-.") return null;
  const n = parseFloat(text);
  return Number.isNaN(n) ? null : n;
}

export default function AppNumeric(props: AppInputProps) {
  // Igual que en AppInput: el texto `error` no debe pisar a hasError.
  const { value, onChange, onBlur, hasError, error: _error, ...restProps } = props;
  const fieldProps = useFieldInputProps();

  const readonly = props.readonly || false;

  // Lo escrito se guarda como texto: antes el campo mostraba el número ya
  // convertido, y "1." se volvía 1 al instante, así que no se podían teclear
  // decimales (1.5 terminaba en 15).
  const [text, setText] = useState(value == null ? "" : String(value));

  // Un cambio que viene de fuera (cargar el registro, los botones + y −)
  // reemplaza el texto; uno que ya coincide con lo escrito ("1." y 1) no.
  useEffect(() => {
    const incoming = value == null || (value as unknown) === "" ? null : Number(value);
    if (incoming !== toNumber(text)) {
      setText(incoming == null || Number.isNaN(incoming) ? "" : String(incoming));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChangeText(raw: string) {
    // Coma decimal → punto; fuera letras y un segundo punto.
    let next = raw.replace(",", ".").replace(/[^0-9.-]/g, "");
    next = next.replace(/(?!^)-/g, "");
    const dot = next.indexOf(".");
    if (dot >= 0) next = next.slice(0, dot + 1) + next.slice(dot + 1).replace(/\./g, "");
    setText(next);
    // Vacío → null: formDataUtils omite el campo en vez de mandar "NaN".
    onChange?.(toNumber(next) as number);
  }

  return (
    <View>
      {!readonly ? (
        <TextInput
          mode="outlined"
          value={text}
          keyboardType="decimal-pad"
          inputMode="decimal"
          onChangeText={handleChangeText}
          onBlur={onBlur}
          error={hasError}
          {...fieldProps}
          {...restProps}
          style={[fieldProps.style, restProps.style]}
        />
      ) : (
        <ReadonlyText text={value == null ? "" : String(value)} />
      )}
    </View>
  );
}

export const FormNumeric = MakeForm(AppNumeric);
