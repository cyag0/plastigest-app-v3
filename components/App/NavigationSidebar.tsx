import NotificationBell from "@/components/Notifications/NotificationBell";
import ContextSwitcherModal from "@/components/App/ContextSwitcherModal";
import UserMenu from "@/components/App/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, usePathname } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { tokens } from "@/constants/tokens";
import SidebarItem from "./SidebarItem";
import SidebarSectionLabel from "./SidebarSectionLabel";
import UserBlock from "./UserBlock";

const STORAGE_KEY_COLLAPSED = "@plastigest/sidebar.collapsed";

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

// Strip the expo-router group prefix from a route, e.g.
// "/(tabs)/home/production" -> "/home/production"
const routeToPathname = (route: string) => route.replace(/^\/\([^)]+\)/, "");

interface NavItem {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "General",
    items: [
      {
        label: "Inicio",
        icon: "home-variant",
        route: "/(tabs)/home",
      },
      {
        label: "Dashboard",
        icon: "view-dashboard-outline",
        route: "/(tabs)/reports",
      },
    ],
  },
  {
    label: "Inventario",
    items: [
      {
        label: "Inventario",
        icon: "archive-outline",
        route: "/(tabs)/inventory",
      },
      {
        label: "Producción",
        icon: "factory",
        route: "/(tabs)/home/production",
      },
      {
        label: "Transferencias",
        icon: "swap-horizontal",
        route: "/(tabs)/home/transfers-menu",
      },
    ],
  },
  {
    label: "Ventas",
    items: [
      {
        label: "Ventas",
        icon: "cart-outline",
        route: "/(tabs)/home/sales",
      },
      {
        label: "Pedidos",
        icon: "clipboard-list-outline",
        route: "/(tabs)/home/sales-orders",
      },
      {
        label: "Caja",
        icon: "cash-multiple",
        route: "/(tabs)/home/cash",
      },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        label: "Administración",
        icon: "cog-outline",
        route: "/(tabs)/administration",
      },
    ],
  },
];

export default function NavigationSidebar() {
  const pathname = usePathname();
  const { loadUnreadNotificationsCount, unreadNotificationsCount, location } =
    useAuth();
  const { mode } = useTheme();

  const [collapsed, setCollapsed] = useState(false);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  // Controla el modal de cambio de empresa/sucursal. Lo abrimos
  // desde el bloque de sucursal del sidebar y desde el menu de
  // usuario, en lugar de empujar a una ruta nueva (que sacaba al
  // usuario de su tab actual).
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switcherInitialView, setSwitcherInitialView] = useState<
    "location" | "company"
  >("location");

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotificationsCount();
    }, [loadUnreadNotificationsCount])
  );

  // Cargar estado de colapsado persistido
  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_COLLAPSED).then((value) => {
      if (value === "1") setCollapsed(true);
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY_COLLAPSED, next ? "1" : "0");
      return next;
    });
  }, []);

  const isActive = (route: string) => pathname === routeToPathname(route);

  const handleNavigation = useCallback((route: string) => {
    router.push(route as any);
  }, []);

  const handleSwitchLocation = useCallback(() => {
    // Antes: router.push("/(stacks)/selectLocation") -> sacaba al
    // usuario del tab en el que estaba. Ahora abrimos el modal
    // contextual para que pueda cambiar de sucursal sin perder
    // su lugar en la app.
    setSwitcherInitialView("location");
    setSwitcherVisible(true);
  }, []);

  // Color del logo: blanco si el primary es oscuro (light), oscuro
  // si el primary es claro (dark). Lo derivamos del mode.
  const logoForeground = mode === "dark" ? "#0F172A" : "#FFFFFF";
  // Color del icono de texto (chevron, map-marker): del theme
  const iconMuted = mode === "dark" ? "#64748B" : "#94A3B8";
  const iconSecondary = mode === "dark" ? "#CBD5E1" : "#475569";

  const styles = useThemedStyles((colors) => ({
    container: {
      height: "100%",
      borderRightWidth: 1,
      borderRightColor: colors.border,
      ...tokens.shadow.xs,
    },
    containerCollapsed: {
      backgroundColor: colors.surface,
    },
    containerExpanded: {
      backgroundColor: colors.surfaceMuted,
    },
    header: {
      padding: 12,
      paddingHorizontal: 16,
      height: 64,
      justifyContent: "center",
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    logoBox: {
      width: 32,
      height: 32,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    appName: {
      ...tokens.typography.h3,
      color: colors.text,
      flex: 1,
    },
    collapseButton: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    collapsedLogoButton: {
      alignItems: "center",
      justifyContent: "center",
    },
    collapsedLocationButton: {
      alignItems: "center",
      paddingVertical: 8,
    },
    searchSlot: {
      paddingHorizontal: 12,
      paddingBottom: 4,
    },
    navigation: {
      flex: 1,
    },
    navigationContent: {
      paddingTop: 4,
      paddingBottom: 8,
    },
    footer: {
      paddingHorizontal: 12,
      paddingBottom: 8,
    },
    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 12,
      minHeight: 36,
    },
    footerLabel: {
      ...tokens.typography.body,
      color: colors.textSecondary,
      flex: 1,
    },
    unreadChip: {
      minWidth: 20,
      height: 20,
      borderRadius: 9999,
      paddingHorizontal: 6,
      backgroundColor: colors.error,
      alignItems: "center",
      justifyContent: "center",
    },
    unreadChipText: {
      color: colors.textInverse,
      ...tokens.typography.micro,
    },
    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 12,
      minHeight: 36,
    },
    locationInfo: {
      flex: 1,
    },
    locationLabel: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
  }));

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <View
      style={[
        styles.container,
        collapsed ? styles.containerCollapsed : styles.containerExpanded,
        { width },
      ]}
    >
      {/* Header con logo y toggle */}
      <View style={styles.header}>
        {!collapsed ? (
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons
                name="package-variant"
                size={20}
                color={logoForeground}
              />
            </View>
            <Text style={styles.appName} numberOfLines={1}>
              PlastiGest
            </Text>
            <TouchableOpacity
              onPress={toggleCollapsed}
              style={styles.collapseButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Colapsar sidebar"
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={18}
                color={iconMuted}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={toggleCollapsed}
            style={styles.collapsedLogoButton}
            accessibilityLabel="Expandir sidebar"
          >
            <View style={styles.logoBox}>
              <MaterialCommunityIcons
                name="package-variant"
                size={20}
                color={logoForeground}
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Busqueda (solo expandido) */}
      {!collapsed && (
        <View style={styles.searchSlot}>
          {/* Reutilizable: si se quiere buscar global, montar SearchInput aqui */}
        </View>
      )}

      {/* Navigation items */}
      <ScrollView
        style={styles.navigation}
        contentContainerStyle={styles.navigationContent}
        showsVerticalScrollIndicator={false}
      >
        {NAV_SECTIONS.map((section) => (
          <View key={section.label}>
            <SidebarSectionLabel
              label={section.label}
              collapsed={collapsed}
            />
            {section.items.map((item) => {
              const isHome = item.route === "/(tabs)/home";
              const showBadge = isHome && unreadNotificationsCount > 0;
              return (
                <SidebarItem
                  key={item.route}
                  icon={item.icon}
                  label={item.label}
                  active={isActive(item.route)}
                  collapsed={collapsed}
                  badge={
                    showBadge
                      ? { value: unreadNotificationsCount, variant: "error" }
                      : undefined
                  }
                  onPress={() => handleNavigation(item.route)}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer: campana + sucursal + usuario */}
      <View style={styles.footer}>
        {/* Notificaciones (compactas) */}
        {!collapsed && (
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/notifications" as any)}
            style={styles.footerRow}
            activeOpacity={0.7}
          >
            <NotificationBell
              iconColor={iconSecondary}
              badgeSize="medium"
            />
            <Text style={styles.footerLabel}>Notificaciones</Text>
            {unreadNotificationsCount > 0 && (
              <View style={styles.unreadChip}>
                <Text style={styles.unreadChipText}>
                  {unreadNotificationsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Sucursal activa */}
        {!collapsed ? (
          <TouchableOpacity
            onPress={handleSwitchLocation}
            style={styles.locationRow}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={16}
              color={iconMuted}
            />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel} numberOfLines={1}>
                {location?.name || "Sin sucursal"}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="swap-horizontal"
              size={14}
              color={iconMuted}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSwitchLocation}
            style={styles.collapsedLocationButton}
            accessibilityLabel={`Sucursal: ${location?.name || "Sin sucursal"}`}
          >
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={18}
              color={iconSecondary}
            />
          </TouchableOpacity>
        )}

        {/* Divisor */}
        <View style={styles.divider} />

        {/* User block (trigger de UserMenu) */}
        <UserMenu
          visible={userMenuVisible}
          onDismiss={() => setUserMenuVisible(false)}
          anchor={
            <UserBlock
              collapsed={collapsed}
              onPress={() => setUserMenuVisible(true)}
            />
          }
          onOpenContextSwitcher={(view) => {
            setUserMenuVisible(false);
            setSwitcherVisible(true);
            setSwitcherInitialView(view);
          }}
        />
      </View>

      {/* Modal de cambio de empresa/sucursal. No interfiere con
          el tab actual: el modal vive en un Portal encima de la UI
          y al cerrarse el usuario sigue donde estaba. */}
      <ContextSwitcherModal
        visible={switcherVisible}
        onDismiss={() => setSwitcherVisible(false)}
        initialView={switcherInitialView}
      />
    </View>
  );
}
