/**
 * Aviso breve del kiosko ("Agregado: Agua de coco", "Solo quedan 3"). No
 * bloquea: se puede seguir tocando la pantalla mientras se ve. Va encima de
 * la barra del pedido, no tapándola.
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type KioskToastTone = "success" | "info" | "warning";

export interface KioskToastMessage {
  id: number;
  text: string;
  tone: KioskToastTone;
  action?: { label: string; onPress: () => void };
}

const DURATION_MS = 2200;
const DURATION_WITH_ACTION_MS = 5000;

export function useKioskToast() {
  const [toast, setToast] = useState<KioskToastMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const hide = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const show = useCallback(
    (text: string, options?: { tone?: KioskToastTone; action?: KioskToastMessage["action"] }) => {
      clearTimer();
      const id = ++seqRef.current;
      setToast({ id, text, tone: options?.tone ?? "success", action: options?.action });
      timerRef.current = setTimeout(
        () => setToast((current) => (current?.id === id ? null : current)),
        options?.action ? DURATION_WITH_ACTION_MS : DURATION_MS,
      );
    },
    [],
  );

  useEffect(() => clearTimer, []);

  return { toast, show, hide };
}

const ICONS: Record<KioskToastTone, keyof typeof MaterialCommunityIcons.glyphMap> = {
  success: "check-circle",
  info: "information",
  warning: "alert-circle",
};

export default function KioskToast({
  toast,
  bottom,
  onHide,
}: {
  toast: KioskToastMessage | null;
  /** Distancia desde abajo (encima de la barra del pedido). */
  bottom: number;
  onHide: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    wrap: { justifyContent: "flex-end", alignItems: "center", paddingHorizontal: 16 },
    toast: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      maxWidth: 560,
      width: "100%",
      minHeight: 64,
      paddingVertical: 10,
      paddingLeft: 18,
      paddingRight: 10,
      borderRadius: 16,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    text: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: "600", color: c.text },
    action: {
      minHeight: 56,
      minWidth: 56,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    actionPressed: { backgroundColor: c.surfaceMuted },
    actionText: { fontSize: 18, fontWeight: "700", color: c.primary },
  }));

  if (!toast) return null;
  const tone = { success: colors.success, info: colors.info, warning: colors.warning }[toast.tone];

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.toast} testID="kiosk-toast" role="status" accessibilityLiveRegion="polite">
        <MaterialCommunityIcons name={ICONS[toast.tone]} size={26} color={tone} />
        <Text style={styles.text}>{toast.text}</Text>
        {toast.action ? (
          <Pressable
            onPress={() => {
              toast.action?.onPress();
              onHide();
            }}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
            testID="kiosk-toast-action"
          >
            <Text style={styles.actionText}>{toast.action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
