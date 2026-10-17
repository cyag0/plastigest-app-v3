import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import { View } from "react-native";
import { TextInput, TouchableRipple } from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import { CalendarDate } from "react-native-paper-dates/lib/typescript/Date/Calendar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MakeForm from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";
import { useFieldInputProps } from "./AppInput";
import { formatDate, parseLocalDate, toLocalDateString } from "@/utils/dates";

interface AppDatePickerProps {
  value?: string;
  onChange?: (value: string, date: Dayjs) => void;
  label?: string;
  placeholder?: string;
  readonly?: boolean;
  /** Fechas que se pueden elegir; p. ej. `{ endDate: new Date() }` para no permitir futuras. */
  validRange?: { startDate?: Date; endDate?: Date; disabledDates?: Date[] };
}

export default function AppDatePicker(props: AppDatePickerProps) {
  const { colors } = useTheme();
  const fieldProps = useFieldInputProps();

  const [time, setTime] = React.useState({
    hours: 0,
    minutes: 0,
  });

  const [date, setDate] = React.useState<CalendarDate>(undefined);
  // Se muestra "Hoy, 17 oct 2026" en vez de "2026-10-17" (el valor sigue
  // siendo YYYY-MM-DD).
  const shownValue = props.value
    ? `${props.value === toLocalDateString() ? "Hoy, " : ""}${formatDate(props.value)}`
    : "";
  const [open, setOpen] = React.useState(false);

  const readonly = props.readonly || false;

  const onDismissSingle = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onConfirmSingle = React.useCallback(
    (params: { date: CalendarDate }) => {
      setOpen(false);
      if (params.date) {
        const date = dayjs(params.date);

        if (props.onChange) {
          props.onChange(date.format("YYYY-MM-DD"), date);
        }
        setDate(params.date);
      }
    },
    [setOpen, setDate]
  );

  return (
    <SafeAreaProvider>
      {readonly ? (
        <ReadonlyText text={props.value ? formatDate(props.value) : ""} />
      ) : (
        <View>
          <TouchableRipple onPress={() => setOpen(true)} borderless style={{ borderRadius: tokens.radius.md }}>
            <View pointerEvents="none">
              <TextInput
                readOnly
                value={shownValue}
                mode="outlined"
                label={props.label}
                placeholder={props.placeholder || "Selecciona una fecha"}
                right={<TextInput.Icon icon="calendar-blank-outline" color={colors.textSecondary} />}
                {...fieldProps}
              />
            </View>
          </TouchableRipple>
          <DatePickerModal
            visible={open}
            onDismiss={onDismissSingle}
            onConfirm={onConfirmSingle}
            date={date ?? (props.value ? parseLocalDate(props.value) : undefined)}
            mode="single"
            locale="es"
            label="Seleccionar fecha"
            saveLabel="Guardar"
            cancelLabel="Cancelar"
            presentationStyle="pageSheet"
            validRange={props.validRange}
          />
        </View>
      )}
    </SafeAreaProvider>
  );
}

export const FormDatePicker = MakeForm(AppDatePicker);
