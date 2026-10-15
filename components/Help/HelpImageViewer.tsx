import type { HelpImage } from "@/help/images";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HelpImageViewerProps {
  image: HelpImage | null;
  caption?: string;
  onClose: () => void;
}

/** Captura de la ayuda a pantalla completa; se cierra tocando en cualquier lado. */
export default function HelpImageViewer({ image, caption, onClose }: HelpImageViewerProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={!!image} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 16 }]}
        onPress={onClose}
        accessibilityLabel="Cerrar imagen"
      >
        {image && (
          <Image source={image.source} style={styles.image} contentFit="contain" />
        )}
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </Pressable>
      <View style={[styles.closeButton, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar">
          <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    paddingHorizontal: 12,
    gap: 12,
  },
  image: { flex: 1, width: "100%" },
  caption: {
    ...tokens.typography.body,
    color: "#E6E1D5",
    textAlign: "center",
  },
  closeButton: { position: "absolute", right: 16 },
});
