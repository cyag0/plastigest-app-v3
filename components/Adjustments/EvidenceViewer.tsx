/**
 * Las fotos de un ajuste a pantalla completa, con anterior / siguiente si son
 * varias. Como el visor de la ayuda (HelpImageViewer), pero con fotos del
 * servidor: fondo oscuro fijo en ambos temas y se cierra tocando fuera.
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  photos: string[];
  /** La que se ve; null: cerrado. */
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
}

export default function EvidenceViewer({ photos, index, onChange, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const visible = index !== null && !!photos[index];
  const count = photos.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 20 }]}
        onPress={onClose}
        accessibilityLabel="Cerrar foto"
      >
        {visible && <Image source={{ uri: photos[index!] }} style={styles.image} contentFit="contain" />}
        {count > 1 && visible && <Text style={styles.caption}>{`${index! + 1} de ${count}`}</Text>}
      </Pressable>

      {count > 1 && visible && (
        <>
          <ArrowButton side="left" disabled={index === 0} onPress={() => onChange(Math.max(0, index! - 1))} />
          <ArrowButton
            side="right"
            disabled={index === count - 1}
            onPress={() => onChange(Math.min(count - 1, index! + 1))}
          />
        </>
      )}

      <View style={[styles.close, { top: insets.top + 12 }]} pointerEvents="box-none">
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
          <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

function ArrowButton({ side, disabled, onPress }: { side: "left" | "right"; disabled: boolean; onPress: () => void }) {
  if (disabled) return null;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.arrow, side === "left" ? { left: 12 } : { right: 12 }]}
      accessibilityRole="button"
      accessibilityLabel={side === "left" ? "Foto anterior" : "Foto siguiente"}
    >
      <MaterialCommunityIcons name={side === "left" ? "chevron-left" : "chevron-right"} size={30} color="#FFFFFF" />
    </Pressable>
  );
}

// Visor a pantalla completa: fondo oscuro y texto claro fijos en ambos temas.
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 17, 12, 0.94)",
    paddingHorizontal: 12,
    gap: 12,
  },
  image: { flex: 1, width: "100%" },
  caption: { color: "#E6E1D5", textAlign: "center", fontSize: 14 },
  close: { position: "absolute", right: 16 },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
});
