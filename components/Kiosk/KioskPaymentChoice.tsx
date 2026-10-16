/**
 * Cómo paga el cliente. Fase 1: solo en caja, así que se muestra la nota
 * fija. En la fase 2 (terminal Mercado Pago Point o Clip) se agrega el método
 * "terminal" a `methods` y aquí mismo se elige entre los dos.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export type KioskPaymentMethod = "counter" | "terminal";

const METHODS: Record<
  KioskPaymentMethod,
  { title: string; note: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  counter: {
    title: "Pagar en caja",
    note: "Pagas en caja con efectivo, tarjeta o transferencia.",
    icon: "cash-register",
  },
  terminal: {
    title: "Pagar aquí con tarjeta",
    note: "Pagas con tu tarjeta en la terminal del kiosko.",
    icon: "credit-card-outline",
  },
};

interface Props {
  methods?: KioskPaymentMethod[];
  value?: KioskPaymentMethod;
  onChange?: (method: KioskPaymentMethod) => void;
}

export default function KioskPaymentChoice({ methods = ["counter"], value = "counter", onChange }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    note: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
    noteText: { flex: 1, fontSize: 18, lineHeight: 26, color: c.text },
    group: { borderWidth: 1, borderColor: c.border, borderRadius: 16, overflow: "hidden", backgroundColor: c.surface },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 16 },
    option: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 },
    optionSelected: { backgroundColor: c.primarySoft },
    optionBody: { flex: 1, paddingVertical: 10 },
    optionTitle: { fontSize: 18, fontWeight: "600", color: c.text },
    optionNote: { fontSize: 16, color: c.textSecondary },
  }));

  if (methods.length <= 1) {
    const only = METHODS[methods[0] ?? "counter"];
    return (
      <View style={styles.note} testID="kiosk-payment-note">
        <MaterialCommunityIcons name={only.icon} size={26} color={colors.textSecondary} />
        <Text style={styles.noteText}>{only.note}</Text>
      </View>
    );
  }

  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      {methods.map((method, index) => {
        const selected = method === value;
        const info = METHODS[method];
        return (
          <React.Fragment key={method}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => onChange?.(method)}
              style={[styles.option, selected && styles.optionSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={info.title}
              testID={`kiosk-payment-${method}`}
            >
              <MaterialCommunityIcons
                name={selected ? "radiobox-marked" : "radiobox-blank"}
                size={26}
                color={selected ? colors.primary : colors.textSecondary}
              />
              <View style={styles.optionBody}>
                <Text style={styles.optionTitle}>{info.title}</Text>
                <Text style={styles.optionNote}>{info.note}</Text>
              </View>
            </Pressable>
          </React.Fragment>
        );
      })}
    </View>
  );
}
