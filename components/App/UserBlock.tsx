import { useAuth } from "@/contexts/AuthContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { tokens } from "@/constants/tokens";

export interface UserBlockProps {
  collapsed?: boolean;
  onPress?: () => void;
}

/**
 * Bloque compacto de usuario (avatar + nombre + rol) que
 * actua como trigger del UserMenu. Estilo SaaS.
 */
export default function UserBlock({ collapsed = false, onPress }: UserBlockProps) {
  const { user } = useAuth();
  const initial = user?.name?.charAt(0).toUpperCase() || "U";
  const role = user?.roles?.[0]?.name || "Usuario";

  const styles = useThemedStyles((colors) => ({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 8,
      gap: 10,
      borderRadius: 12,
      minHeight: 40,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    initial: {
      color: colors.primaryForeground,
      fontSize: 13,
      fontWeight: "700",
    },
    info: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      ...tokens.typography.bodyMd,
      color: colors.text,
    },
    role: {
      ...tokens.typography.caption,
      color: colors.textMuted,
      marginTop: 1,
    },
    collapsedWrapper: {
      alignItems: "center",
    },
    collapsedAvatar: {
      width: 36,
      height: 36,
      borderRadius: 9999,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    collapsedInitial: {
      color: colors.primaryForeground,
      fontSize: 14,
      fontWeight: "700",
    },
    chevron: {
      color: colors.textMuted,
    },
  }));

  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.collapsedWrapper}
        accessibilityLabel="Menu de usuario"
      >
        <View style={styles.collapsedAvatar}>
          <Text style={styles.collapsedInitial}>{initial}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.container}
      accessibilityLabel="Menu de usuario"
    >
      <View style={styles.avatar}>
        <Text style={styles.initial}>{initial}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name || "Usuario"}
        </Text>
        <Text style={styles.role} numberOfLines={1}>
          {role}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-up"
        size={16}
        color={styles.chevron.color}
      />
    </TouchableOpacity>
  );
}
