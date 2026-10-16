/**
 * Aviso dentro de la pantalla ("Ya no alcanza: …"): ícono del tono, texto
 * grande y fondo suave del tema.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

export interface KioskNoticeMessage {
  tone: "info" | "warning" | "error";
  text: string;
}

export default function KioskNotice({ notice, testID = "kiosk-notice" }: { notice: KioskNoticeMessage; testID?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    box: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    text: { flex: 1, fontSize: 18, lineHeight: 26, color: c.text },
  }));
  const tone = {
    info: { icon: "information-outline" as const, color: colors.info, bg: colors.infoSoft },
    warning: { icon: "alert-outline" as const, color: colors.warning, bg: colors.warningSoft },
    error: { icon: "alert-circle-outline" as const, color: colors.error, bg: colors.errorSoft },
  }[notice.tone];

  return (
    <View style={[styles.box, { backgroundColor: tone.bg }]} testID={testID} role="alert" accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name={tone.icon} size={26} color={tone.color} />
      <Text style={styles.text}>{notice.text}</Text>
    </View>
  );
}
