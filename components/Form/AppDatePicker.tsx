import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import dayjs, { Dayjs } from "dayjs";
import React from "react";
import { View } from "react-native";
import { TextInput, TouchableRipple } from "react-native-paper";
import { DatePickerModal } from "react-native-paper-dates";
import { CalendarDate } from "react-native-paper-dates/lib/typescript/Date/Calendar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MakeForm from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";
import { useInputPaperTheme } from "./AppInput";

interface AppDatePickerProps {
  value?: string;
  onChange?: (value: string, date: Dayjs) => void;
  label?: string;
  placeholder?: string;
  readonly?: boolean;
}

export default function AppDatePicker(props: AppDatePickerProps) {
  const { colors } = useTheme();
  const paperTheme = useInputPaperTheme();
  const styles = useThemedStyles((c) => ({
    container: {
      marginVertical: tokens.spacing[2],
    },
    input: {
      backgroundColor: c.surface,
    },
    inputContent: {
      ...tokens.typography.body,
      color: c.text,
    },
  }));

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
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.text}
                placeholderTextColor={colors.textMuted}
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

export const FormDatePicker = MakeForm(AppDatePicker);
