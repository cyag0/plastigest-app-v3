/**
 * Diálogo y hoja inferior del kiosko. Se dibujan dentro de la pantalla (no
 * en un Portal ni en un Modal) para que cada toque dentro de ellos también
 * reinicie el contador de inactividad, que escucha en la raíz del kiosko.
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OverlayProps {
  visible: boolean;
  /** Tocar fuera cierra (si se omite, tocar fuera no hace nada). */
  onDismiss?: () => void;
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

/** Fondo oscurecido del tema y, si se puede cerrar, tocar fuera cierra. */
function Backdrop({ onDismiss }: { onDismiss?: () => void }) {
  const styles = useThemedStyles((c) => ({ backdrop: { backgroundColor: c.overlay } }));
  if (!onDismiss) return <View style={[StyleSheet.absoluteFill, styles.backdrop]} />;
  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.backdrop]}
      onPress={onDismiss}
      accessibilityRole="button"
      accessibilityLabel="Cerrar"
    />
  );
}

/** Diálogo centrado. */
export function KioskDialog({
  visible,
  onDismiss,
  children,
  testID,
  accessibilityLabel,
  maxWidth = 520,
}: OverlayProps & { maxWidth?: number }) {
  const styles = useThemedStyles((c) => ({
    wrap: { alignItems: "center", justifyContent: "center", padding: 16 },
    card: {
      width: "100%",
      backgroundColor: c.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 24,
      gap: 16,
      maxHeight: "100%",
    },
  }));
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]}>
      <Backdrop onDismiss={onDismiss} />
      <View
        style={[styles.card, { maxWidth }]}
        testID={testID}
        role="dialog"
        aria-modal
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </View>
    </View>
  );
}

/** Hoja que sube desde abajo (opciones de un producto). */
export function KioskSheet({ visible, onDismiss, children, testID, accessibilityLabel }: OverlayProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles((c) => ({
    wrap: { justifyContent: "flex-end", alignItems: "center" },
    sheet: {
      width: "100%",
      maxWidth: 720,
      maxHeight: "88%",
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
    },
    content: { padding: 20, gap: 16 },
  }));
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]}>
      <Backdrop onDismiss={onDismiss} />
      <View style={styles.sheet} testID={testID} role="dialog" aria-modal accessibilityLabel={accessibilityLabel}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 20 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
