import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

export interface EmptyStateProps {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/**
 * Estado vacio reusable. Ilustracion inline (icono grande) +
 * titulo + descripcion + accion opcional. Inspirado en Notion.
 */
export default function EmptyState({
  icon = "inbox-outline",
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles((c) => ({
    container: {
      alignItems: "center",
      justifyContent: "center",
    },
    compactContainer: {
      paddingVertical: 24,
      paddingHorizontal: 16,
      gap: 4,
    },
    largeContainer: {
      paddingVertical: 48,
      paddingHorizontal: 24,
      gap: 8,
    },
    iconWrapper: {
      marginBottom: 8,
    },
    title: {
      color: c.text,
      fontWeight: "600",
      textAlign: "center",
    },
    description: {
      color: c.textSecondary,
      textAlign: "center",
      maxWidth: 320,
    },
  }));

  return (
    <View
      style={[
        styles.container,
        compact ? styles.compactContainer : styles.largeContainer,
      ]}
    >
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons
          name={icon}
          size={compact ? 48 : 64}
          color={colors.textMuted}
        />
      </View>
      <Text
        variant={compact ? "titleSmall" : "titleMedium"}
        style={styles.title}
      >
        {title}
      </Text>
      {description && (
        <Text variant="bodySmall" style={styles.description}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          mode="outlined"
          onPress={onAction}
          style={{ marginTop: 16 }}
          textColor={colors.primary}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
