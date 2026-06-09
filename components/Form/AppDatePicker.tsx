import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import { View } from "react-native";
import { TextInput, TouchableRipple } from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import { CalendarDate } from "react-native-paper-dates/lib/typescript/Date/Calendar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MakeForm from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";

interface AppDatePickerProps {
  value?: string;
  onChange?: (value: string, date: Dayjs) => void;
  label?: string;
  placeholder?: string;
  readonly?: boolean;
}

const paperTheme = {
  colors: {
    primary: palette.primary,
    onSurfaceVariant: palette.textSecondary,
    outline: palette.border,
    surface: palette.surface,
    onSurface: palette.text,
    error: palette.error,
  },
};

export default function AppDatePicker(props: AppDatePickerProps) {
  const [time, setTime] = React.useState({
    hours: 0,
    minutes: 0,
  });

  const [date, setDate] = React.useState<CalendarDate>(undefined);
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
        <ReadonlyText text={props.value || ""} />
      ) : (
        <View style={styles.container}>
          <TouchableRipple onPress={() => setOpen(true)}>
            <View pointerEvents="none">
              <TextInput
                readOnly
                value={props.value || ""}
                mode="outlined"
                label={props.label}
                placeholder={props.placeholder || "Selecciona una fecha"}
                right={<TextInput.Icon icon="calendar" />}
                theme={paperTheme}
                outlineColor={palette.border}
                activeOutlineColor={palette.primary}
                textColor={palette.text}
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                contentStyle={styles.inputContent}
              />
            </View>
          </TouchableRipple>
          <DatePickerModal
            visible={open}
            onDismiss={onDismissSingle}
            onConfirm={onConfirmSingle}
            date={date}
            mode="single"
            locale="es"
            label="Seleccionar fecha"
            saveLabel="Guardar"
            cancelLabel="Cancelar"
            presentationStyle="pageSheet"
          />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = {
  container: {
    marginVertical: tokens.spacing[2],
  },
  input: {
    backgroundColor: palette.surface,
  },
  inputContent: {
    ...tokens.typography.body,
    color: palette.text,
  },
};

export const FormDatePicker = MakeForm(AppDatePicker);
