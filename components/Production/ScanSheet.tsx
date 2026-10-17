/**
 * Modo escáner: una ventana con un campo que recibe lo que manda un lector de
 * códigos (los USB o Bluetooth "teclean" el código y un Enter) y un botón para
 * usar la cámara. Cada código se entrega a `onCode`, que responde qué se
 * agregó; la ventana sigue abierta para escanear el siguiente.
 */

import BarcodeScanner, { BarcodeScannerRef } from "@/components/Form/BarcodeScanner";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, type TextInputInstance, View } from "react-native";
import { Button, Modal, Portal } from "react-native-paper";

export interface ScanResult {
  ok: boolean;
  message: string;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  hint?: string;
  /** Recibe el código; devuelve lo que pasó ("Agua de Coco 1 L · 52"). */
  onCode: (code: string) => ScanResult;
}

export default function ScanSheet({ visible, onDismiss, title = "Escanear", hint, onCode }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState("");
  const [last, setLast] = useState<ScanResult | null>(null);
  const camera = useRef<BarcodeScannerRef>(null);
  const input = useRef<TextInputInstance>(null);

  const styles = useThemedStyles((c) => ({
    card: {
      alignSelf: "center",
      width: "92%",
      maxWidth: 440,
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 20,
      gap: 14,
    },
    title: { fontSize: 18, fontWeight: "700", color: c.text },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    field: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.background,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    cameraButton: {
      width: 48,
      height: 48,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    result: { flexDirection: "row", alignItems: "center", gap: 8 },
    resultText: { flex: 1, fontSize: 14, fontWeight: "500" },
  }));

  const handle = (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setLast(onCode(clean));
    setText("");
    // El lector sigue mandando códigos al mismo campo.
    setTimeout(() => input.current?.focus(), 50);
  };

  const close = () => {
    setText("");
    setLast(null);
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={close} contentContainerStyle={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
        <View style={styles.fieldRow}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => handle(text)}
            placeholder="Escanea o escribe el código"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
            blurOnSubmit={false}
            returnKeyType="done"
            style={styles.field}
          />
          <Pressable
            onPress={() => camera.current?.open()}
            style={({ pressed }) => [styles.cameraButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Escanear con la cámara"
          >
            <MaterialCommunityIcons name="camera-outline" size={22} color={colors.primary} />
          </Pressable>
        </View>
        {last && (
          <View style={styles.result}>
            <MaterialCommunityIcons
              name={last.ok ? "check-circle-outline" : "alert-circle-outline"}
              size={20}
              color={last.ok ? colors.success : colors.error}
            />
            <Text style={[styles.resultText, { color: last.ok ? colors.text : colors.error }]}>{last.message}</Text>
          </View>
        )}
        <Button mode="contained" onPress={close}>
          Listo
        </Button>
        <BarcodeScanner ref={camera} onScanned={handle} />
      </Modal>
    </Portal>
  );
}
