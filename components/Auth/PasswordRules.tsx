/**
 * Lo que debe cumplir una contraseña nueva, a la vista mientras se escribe:
 * cada regla se palomea al cumplirse. Tras intentar guardar, las que faltan
 * se marcan en rojo (en vez de un mensaje de error por campo).
 */

import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export interface PasswordRule {
  label: string;
  met: boolean;
}

/**
 * Las reglas que valida el backend: 8 caracteres o más y la confirmación
 * igual (new_password|password: min:8, confirmed).
 */
export function passwordRules(password: string, confirmation: string): PasswordRule[] {
  return [
    { label: "Al menos 8 caracteres", met: password.length >= 8 },
    { label: "Las dos contraseñas coinciden", met: password.length > 0 && password === confirmation },
  ];
}

export default function PasswordRules({ rules, showErrors }: { rules: PasswordRule[]; showErrors?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.list}>
      {rules.map((rule) => {
        const failed = showErrors && !rule.met;
        return (
          <View
            key={rule.label}
            style={styles.rule}
            accessible
            accessibilityLabel={`${rule.label}: ${rule.met ? "listo" : "falta"}`}
          >
            <MaterialCommunityIcons
              name={rule.met ? "check-circle" : failed ? "alert-circle-outline" : "circle-outline"}
              size={16}
              color={rule.met ? colors.success : failed ? colors.error : colors.textMuted}
            />
            <Text style={[styles.label, failed && styles.labelFailed]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  list: { gap: 6 },
  rule: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  labelFailed: { color: c.error },
}));
