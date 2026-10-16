import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Searchbar } from "react-native-paper";

/**
 * Buscador con el mismo aspecto que el de los listados (AppList), para las
 * pantallas que arman su propia lista (Tareas, Notificaciones).
 */
export default function ListSearchbar({
  value,
  onChangeText,
  placeholder = "Buscar...",
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles((c) => ({
    bar: {
      backgroundColor: c.surface,
      elevation: 0,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
    },
  }));

  return (
    <Searchbar
      value={value}
      onChangeText={onChangeText}
      onClearIconPress={() => onChangeText("")}
      placeholder={placeholder}
      mode="bar"
      style={[styles.bar, style]}
    />
  );
}
