import dayjs, { Dayjs } from "dayjs";
import { useField } from "formik";
import React, { useEffect } from "react";
import { View } from "react-native";
import { TextInput, TouchableRipple } from "react-native-paper";
import { TimePickerModal } from "react-native-paper-dates";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MakeForm from "./AppForm/hoc";

interface AppTimePickerProps {
  value?: string | Dayjs;
  label?: string;
  placeholder?: string;
  onChange?: (value: string, date: Dayjs) => void;
}

export default function AppTimePicker(props: AppTimePickerProps) {
  const [time, setTime] = React.useState({
    hours: 0,
    minutes: 0,
  });

  const [visible, setVisible] = React.useState(false);
  const onDismiss = React.useCallback(() => {
    setVisible(false);
  }, [setVisible]);

  const onConfirm = React.useCallback(
    ({ hours, minutes }: { hours: number; minutes: number }) => {
      setVisible(false);

      if (!hours && !minutes) {
        return;
      }

      const date = dayjs().hour(hours).minute(minutes);
      if (props.onChange) {
        props.onChange(`${hours}:${minutes}`, date);
      }
    },
    [setVisible]
  );

  useEffect(() => {
    if (!props.value) return;

    if (typeof props.value === "string") {
      const isTimeOnly = /^([01]\d|2[0-3]):([0-5]\d)$/.test(props.value);
      const isDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(props.value);
      if (!isTimeOnly && !isDateTime) return;

      if (isTimeOnly) {
        const [hours, minutes] = props.value.split(":").map(Number);
        setTime({ hours, minutes });
      } else if (isDateTime) {
        const date = dayjs(props.value);
        setTime({
          hours: date.hour(),
          minutes: date.minute(),
        });
      }
    } else if (props.value instanceof dayjs.Dayjs) {
      setTime({
        hours: props.value.hour(),
        minutes: props.value.minute(),
      });
    }
  }, []);

  return (
    <SafeAreaProvider>
      <View>
        <TouchableRipple onPress={() => setVisible(true)}>
          <TextInput
            readOnly
            value={typeof props.value === "string" ? props.value : ""}
            mode="outlined"
            label={props.label}
            placeholder={props.placeholder || "Ingresa un valor"}
          />
        </TouchableRipple>
        <TimePickerModal
          visible={visible}
          onDismiss={onDismiss}
          onConfirm={onConfirm}
          hours={time.hours || undefined}
          minutes={time.minutes || undefined}
        />
      </View>
    </SafeAreaProvider>
  );
}

export const FormTimePicker = MakeForm(AppTimePicker);
