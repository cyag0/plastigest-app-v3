import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, Badge, Divider, Drawer, Text } from "react-native-paper";

export default function NavigationSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navigationItems = [
    {
      label: "Inicio",
      icon: "home",
      route: "/(tabs)/home",
      segment: "/home",
    },
    {
      label: "Inventario",
      icon: "archive",
      route: "/(tabs)/inventory",
      segment: "/inventory",
    },
    {
      label: "Dashboard",
      icon: "compass-outline",
      route: "/(tabs)/reports",
      segment: "/reports",
    },
    {
      label: "Administración",
      icon: "cog",
      route: "/(tabs)/administration",
      segment: "/administration",
    },
  ];

  const isActive = (segment: string) => {
    return pathname.includes(segment);
  };

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  const handleProfile = () => {
    router.push("/(tabs)/profile");
  };

  const handleNotifications = () => {
    console.log("Notifications pressed");
    // TODO: Implement notifications
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons
            name="package-variant"
            size={32}
            color={palette.primary}
          />
          <Text variant="titleLarge" style={styles.appName}>
            PlastiGest
          </Text>
        </View>
      </View>

      {/* Navigation Items */}
      <View style={styles.navigation}>
        {navigationItems.map((item) => (
          <Drawer.Item
            key={item.route}
            label={item.label}
            icon={item.icon}
            active={isActive(item.segment)}
            onPress={() => handleNavigation(item.route)}
            style={[
              styles.navItem,
              isActive(item.segment) && styles.navItemActive,
            ]}
            labelStyle={[
              styles.navLabel,
              isActive(item.segment) && styles.navLabelActive,
            ]}
          />
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleNotifications}
        >
          <View style={styles.actionContent}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color={palette.textSecondary}
            />
            <Text variant="bodyMedium" style={styles.actionLabel}>
              Notificaciones
            </Text>
            <Badge size={20} style={styles.badge}>
              3
            </Badge>
          </View>
        </TouchableOpacity>
      </View>

      <Divider style={styles.divider} />

      {/* User Profile */}
      <TouchableOpacity
        style={styles.profile}
        onPress={handleProfile}
        activeOpacity={0.7}
      >
        <Avatar.Text
          size={40}
          label={user?.name?.charAt(0).toUpperCase() || "U"}
          style={styles.avatar}
          color={palette.white}
          labelStyle={styles.avatarLabel}
        />
        <View style={styles.profileInfo}>
          <Text variant="bodyMedium" style={styles.profileName}>
            {user?.name || "Usuario"}
          </Text>
          <Text variant="bodySmall" style={styles.profileEmail}>
            {user?.email || "email@example.com"}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={palette.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: "100%",
    backgroundColor: palette.surface,
    borderRightWidth: 1,
    borderRightColor: palette.border,
    shadowColor: "transparent",
  },
  header: {
    padding: 24,
    paddingTop: 32,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appName: {
    color: palette.text,
    fontWeight: "bold",
  },
  navigation: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navItem: {
    borderRadius: 12,
    marginVertical: 2,
  },
  navItemActive: {
    backgroundColor: palette.primary + "15",
  },
  navLabel: {
    color: palette.textSecondary,
    fontWeight: "500",
  },
  navLabelActive: {
    color: palette.primary,
    fontWeight: "600",
  },
  divider: {
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: palette.border,
  },
  actions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionLabel: {
    flex: 1,
    color: palette.textSecondary,
    fontWeight: "500",
  },
  badge: {
    backgroundColor: palette.error,
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    /* borderTopColor: palette.border,
    backgroundColor: palette.background, */
  },
  avatar: {
    backgroundColor: palette.primary,
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: palette.text,
    fontWeight: "600",
  },
  profileEmail: {
    color: palette.textSecondary,
    fontSize: 12,
  },
});
