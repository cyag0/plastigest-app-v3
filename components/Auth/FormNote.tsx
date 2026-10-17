/**
 * Aviso dentro de un formulario (contraseña incorrecta, intentos, qué pasa al
 * guardar): ícono del tono y texto, sobre un fondo suave y sin barra de
 * color al costado.
 */

import { useTheme } from "@/contexts/ThemeContext";
import { tokens } from "@/constants/tokens";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type Tone = "error" | "warning" | "info";

const DEFAULT_ICON: Record<Tone, IconName> = {
  error: "alert-circle-outline",
  warning: "alert-outline",
  info: "information-outline",
};

export default function FormNote({
  tone = "info",
  icon,
  children,
}: {
  tone?: Tone;
  icon?: IconName;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const look = {
    error: { background: colors.errorSoft, icon: colors.error },
    warning: { background: colors.warningSoft, icon: colors.warning },
    info: { background: colors.surfaceMuted, icon: colors.textSecondary },
  }[tone];

  return (
    <View
      style={[styles.note, { backgroundColor: look.background }]}
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
    >
      <MaterialCommunityIcons name={icon ?? DEFAULT_ICON[tone]} size={18} color={look.icon} style={styles.icon} />
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
  },
  icon: { marginTop: 1 },
  text: { flex: 1, fontSize: 14, lineHeight: 20, color: c.text },
}));
