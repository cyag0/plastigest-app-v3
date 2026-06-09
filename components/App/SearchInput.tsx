import { tokens } from "@/constants/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

export interface SearchInputProps extends Omit<TextInputProps, "style"> {
  placeholder?: string;
  width?: number | string;
  showShortcut?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Input de busqueda con icono lupa a la izquierda y shortcut
 * de teclado visible a la derecha. Estilo SaaS moderno.
 */
export default function SearchInput({
  placeholder = "Buscar...",
  width = 360,
  showShortcut = true,
  containerStyle,
  ...rest
}: SearchInputProps) {
  const styles = useThemedStyles((colors) => ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceMuted,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 36,
      borderWidth: 1,
      borderColor: "transparent",
    },
    icon: {
      marginRight: 8,
      color: colors.textMuted,
    },
    input: {
      flex: 1,
      ...tokens.typography.body,
      color: colors.text,
      padding: 0,
      outlineStyle: "none" as any,
    },
    shortcut: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shortcutText: {
      ...tokens.typography.micro,
      color: colors.textMuted,
    },
  }));

  return (
    <View
      style={[
        styles.container,
        { width: (Platform.OS === "web" ? width : "100%") as any },
        containerStyle,
      ]}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={18}
        color={styles.icon.color}
        style={styles.icon}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={styles.icon.color}
        style={styles.input}
        {...rest}
      />
      {showShortcut && Platform.OS === "web" && (
        <View style={styles.shortcut}>
          <Text style={styles.shortcutText}>⌘K</Text>
        </View>
      )}
    </View>
  );
}
