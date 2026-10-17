import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Divider, Menu } from "react-native-paper";

export interface UserMenuProps {
  visible: boolean;
  onDismiss: () => void;
  anchor: React.ReactNode;
  /**
   * Abre el modal de cambio de contexto. `initialView` decide si
   * arranca en la lista de empresas o en la de sucursales.
   */
  onOpenContextSwitcher?: (initialView: "location" | "company") => void;
}

/**
 * Popover de usuario con header (empresa + sucursal) y
 * acciones rapidas: perfil, cambiar empresa/sucursal,
 * preferencias, cerrar sesion. Inspirado en Slack/Notion.
 */
export default function UserMenu({
  visible,
  onDismiss,
  anchor,
  onOpenContextSwitcher,
}: UserMenuProps) {
  const router = useRouter();
  const auth = useAuth();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, selectedCompany, location, logout } = auth;

  const handleProfile = useCallback(() => {
    onDismiss();
    router.push("/(tabs)/profile");
  }, [onDismiss, router]);

  const handleSwitchCompany = useCallback(() => {
    onDismiss();
    onOpenContextSwitcher?.("company");
  }, [onDismiss, onOpenContextSwitcher]);

  const handleSwitchLocation = useCallback(() => {
    onDismiss();
    onOpenContextSwitcher?.("location");
  }, [onDismiss, onOpenContextSwitcher]);

  const handlePreferences = useCallback(() => {
    onDismiss();
    router.push("/(tabs)/preferences" as any);
  }, [onDismiss, router]);

  const handleHelp = useCallback(() => {
    onDismiss();
    router.push("/(stacks)/help" as any);
  }, [onDismiss, router]);

  const handleLogout = useCallback(async () => {
    onDismiss();
    const confirmed = await alerts.confirm("¿Cerrar sesión?", {
      title: "Cerrar sesión",
      okText: "Salir",
      cancelText: "Cancelar",
    });
    if (confirmed) {
      await logout();
      router.replace("/login" as any);
    }
  }, [onDismiss, alerts, logout, router]);

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      contentStyle={styles.menuContent}
    >
      {/* Header con empresa/sucursal */}
      <View style={styles.header}>
        {selectedCompany && (
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="office-building"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedCompany.name}
            </Text>
          </View>
        )}
        {location && (
          <View style={styles.headerRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {location.name}
            </Text>
          </View>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Items */}
      <MenuItem icon="account-circle-outline" label="Mi perfil" onPress={handleProfile} />
      <MenuItem
        icon="office-building-outline"
        label="Cambiar empresa"
        onPress={handleSwitchCompany}
      />
      <MenuItem
        icon="map-marker-outline"
        label="Cambiar sucursal"
        onPress={handleSwitchLocation}
      />
      <MenuItem
        icon="cog-outline"
        label="Preferencias"
        onPress={handlePreferences}
      />
      <MenuItem icon="help-circle-outline" label="Ayuda" onPress={handleHelp} />

      <Divider style={styles.divider} />

      <MenuItem
        icon="logout"
        label="Cerrar sesión"
        onPress={handleLogout}
        danger
      />
    </Menu>
  );
}

interface MenuItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = danger ? colors.error : colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.menuItemLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = themedStyles((c) => ({
  menuContent: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    marginTop: 8,
    paddingVertical: 6,
    width: 260,
    ...tokens.shadow.lg,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    ...tokens.typography.bodyMd,
    color: c.text,
    flex: 1,
  },
  headerSubtitle: {
    ...tokens.typography.caption,
    color: c.textMuted,
    flex: 1,
  },
  divider: {
    backgroundColor: c.border,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
    minHeight: 36,
  },
  menuItemLabel: {
    ...tokens.typography.body,
    flex: 1,
  },
}));
