/**
 * Teclado de PIN grande (teclas de 72) para salir del modo kiosko y para
 * crear el PIN. En web también se puede escribir con el teclado (números,
 * Retroceso y Enter).
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { KIOSK_PIN_MAX_LENGTH, KIOSK_PIN_MIN_LENGTH } from "@/utils/kioskMode";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Enter en el teclado (web). */
  onSubmit?: () => void;
  /** testID de las teclas: `${testIDPrefix}-key-1`, `${testIDPrefix}-backspace`. */
  testIDPrefix?: string;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function KioskPinPad({ value, onChange, disabled, onSubmit, testIDPrefix = "kiosk-pin" }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: { alignItems: "center", gap: 20 },
    dots: { flexDirection: "row", gap: 14, minHeight: 24, alignItems: "center" },
    dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.borderStrong },
    dotFilled: { backgroundColor: c.text, borderColor: c.text },
    grid: { flexDirection: "row", flexWrap: "wrap", width: 3 * 88 + 2 * 12, gap: 12 },
    key: {
      width: 88,
      height: 72,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    keyPressed: { backgroundColor: c.surfaceMuted },
    keyBlank: { width: 88, height: 72 },
    keyText: { fontSize: 30, fontWeight: "700", color: c.text, fontVariant: ["tabular-nums"] },
    keyLabel: { fontSize: 16, fontWeight: "600", color: c.textSecondary },
    disabled: { opacity: 0.45 },
  }));

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    onSubmitRef.current = onSubmit;
  }, [value, onChange, onSubmit]);

  const press = (digit: string) => {
    if (disabled || valueRef.current.length >= KIOSK_PIN_MAX_LENGTH) return;
    onChangeRef.current(valueRef.current + digit);
  };
  const backspace = () => {
    if (disabled) return;
    onChangeRef.current(valueRef.current.slice(0, -1));
  };

  // Teclado físico en web.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || disabled) return;
    const onKey = (event: KeyboardEvent) => {
      // Lo que se escribe en otro campo (p. ej. la búsqueda) no es el PIN.
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        if (valueRef.current.length < KIOSK_PIN_MAX_LENGTH) onChangeRef.current(valueRef.current + event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        onChangeRef.current(valueRef.current.slice(0, -1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        onSubmitRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled]);

  const dotCount = Math.max(KIOSK_PIN_MIN_LENGTH, value.length);

  const digitKey = (digit: string) => (
    <Pressable
      key={digit}
      onPress={() => press(digit)}
      disabled={disabled}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={digit}
      testID={`${testIDPrefix}-key-${digit}`}
    >
      <Text style={styles.keyText}>{digit}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <View
        style={styles.dots}
        accessibilityLabel={`${value.length} ${value.length === 1 ? "dígito escrito" : "dígitos escritos"}`}
        testID={`${testIDPrefix}-dots`}
      >
        {Array.from({ length: dotCount }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map(digitKey)}
        <View style={styles.keyBlank} />
        {digitKey("0")}
        <Pressable
          onPress={backspace}
          disabled={disabled || value.length === 0}
          style={({ pressed }) => [
            styles.key,
            pressed && styles.keyPressed,
            (disabled || value.length === 0) && styles.disabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Borrar un dígito"
          testID={`${testIDPrefix}-backspace`}
        >
          <MaterialCommunityIcons name="backspace-outline" size={28} color={colors.text} />
          <Text style={styles.keyLabel}>Borrar</Text>
        </Pressable>
      </View>
    </View>
  );
}
