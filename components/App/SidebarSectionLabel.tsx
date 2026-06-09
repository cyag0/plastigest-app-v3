import { tokens } from "@/constants/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { Text, View } from "react-native";

export interface SidebarSectionLabelProps {
  label: string;
  collapsed?: boolean;
}

/**
 * Etiqueta de seccion en el sidebar (GENERAL, INVENTARIO, VENTAS).
 * Micro caps uppercase para jerarquia.
 */
export default function SidebarSectionLabel({
  label,
  collapsed = false,
}: SidebarSectionLabelProps) {
  const styles = useThemedStyles((colors) => ({
    container: {
      paddingHorizontal: 12,
      paddingTop: 16,
      paddingBottom: 4,
    },
    label: {
      ...tokens.typography.micro,
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    collapsedSpacer: {
      height: 12,
    },
  }));

  if (collapsed) {
    return <View style={styles.collapsedSpacer} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}
