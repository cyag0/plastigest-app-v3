import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Pressable, View } from "react-native";
import { Switch, Text } from "react-native-paper";
import MakeForm, { InputLabel } from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";

interface AppSwitchProps {
  value?: boolean;
  onChange?: (value: boolean) => void;
  name?: string;
  label?: string;
  text?: string;
  /** Qué pasa al activarlo, en una línea debajo del título. */
  description?: string;
  readonly?: boolean;
  disabled?: boolean;
}

/**
 * Interruptor en un renglón con borde, como el «Activo» de Procesos: el
 * título (y una línea que explica qué hace) a la izquierda y el switch a la
 * derecha. Todo el renglón se puede tocar.
 */
export default function AppSwitch(props: AppSwitchProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      minHeight: 52,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.surface,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    label: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "500",
      color: c.text,
    },
    description: {
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
    },
  }));

  const readonly = props.readonly || false;
  const text = props.label || props.text || "Selecciona una opción";

  function handleChange(value: boolean) {
    if (props.onChange && !readonly) {
      props.onChange(value);
    }
  }

  if (readonly) {
    return (
      <View>
        <InputLabel label={text} />
        <ReadonlyText text={props.value ? "Sí" : "No"} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => !props.disabled && handleChange(!props.value)}
      disabled={props.disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: !!props.value, disabled: props.disabled }}
      accessibilityLabel={text}
      style={[styles.container, props.disabled && { opacity: 0.6 }]}
    >
      <View style={styles.body}>
        <Text style={styles.label}>{text}</Text>
        {!!props.description && <Text style={styles.description}>{props.description}</Text>}
      </View>
      <Switch
        value={!!props.value}
        onValueChange={handleChange}
        color={colors.primary}
        disabled={props.disabled}
      />
    </Pressable>
  );
}

export const FormSwitch = MakeForm(AppSwitch, {
  label: false,
});
