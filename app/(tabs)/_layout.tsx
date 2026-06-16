import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Appbar } from "react-native-paper";

import AppBar from "@/components/App/AppBar";
import NavigationSidebar from "@/components/App/NavigationSidebar";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useResponsive } from "@/hooks/useResponsive";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/**
 * Pantallas para la versión web. Se reutiliza tanto cuando el
 * sidebar es inline (desktop/tablet) como cuando es overlay (móvil),
 * por eso vive en una constante.
 */
function WebTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { display: "none" },
        headerShown: false,
      }}
      initialRouteName="home"
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Dashboard",
          headerShown: true,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              showBackButton={false}
              onSearchPress={() => console.log("Search pressed")}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          ),
        }}
      />
      <Tabs.Screen name="administration" />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          headerShown: true,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              showBackButton={false}
              showSearchButton={false}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          ),
        }}
      />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
      <Tabs.Screen name="preferences" options={{ href: null }} />
    </Tabs>
  );
}

/**
 * Layout web responsivo:
 * - Desktop (>=992px): sidebar inline con toggle manual.
 * - Tablet (768-991px): sidebar inline forzado a rail de iconos.
 * - Móvil (<768px): sidebar oculto; se abre como overlay con
 *   backdrop desde un botón hamburguesa flotante.
 */
function WebTabLayout() {
  const { isMobile, isMd } = useResponsive();
  const isNarrow = isMobile; // <768px -> overlay
  const railMode = isMd; // 768-991px -> rail forzado
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Al pasar a un ancho mayor, cerramos el overlay para no dejar
  // el drawer "pegado" sobre un sidebar inline.
  useEffect(() => {
    if (!isNarrow && drawerOpen) setDrawerOpen(false);
  }, [isNarrow, drawerOpen]);

  const styles = useThemedStyles((colors) => ({
    container: {
      flex: 1,
      flexDirection: "row" as const,
      backgroundColor: "transparent" as any,
    },
    content: {
      flex: 1,
      overflow: "hidden" as const,
      borderRadius: 8,
      backgroundColor: "transparent" as any,
    },
    hamburger: {
      position: "absolute" as const,
      top: 12,
      left: 12,
      zIndex: 50,
      width: 44,
      height: 44,
      borderRadius: 9999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      ...tokens.shadow.md,
    },
    overlayRoot: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: "row" as const,
      zIndex: 100,
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.45)",
    },
  }));

  return (
    <View style={styles.container}>
      {/* Sidebar inline (desktop/tablet). En móvil se omite. */}
      {!isNarrow && <NavigationSidebar forceCollapsed={railMode} />}

      <View style={styles.content}>
        <WebTabs />
      </View>

      {/* Botón hamburguesa flotante (solo móvil, drawer cerrado) */}
      {isNarrow && !drawerOpen && (
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => setDrawerOpen(true)}
          accessibilityLabel="Abrir menú"
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="menu" size={24} color={palette.text} />
        </TouchableOpacity>
      )}

      {/* Drawer overlay + backdrop (solo móvil, drawer abierto) */}
      {isNarrow && drawerOpen && (
        <View style={styles.overlayRoot}>
          <NavigationSidebar
            variant="overlay"
            onRequestClose={() => setDrawerOpen(false)}
          />
          <Pressable
            style={styles.backdrop}
            onPress={() => setDrawerOpen(false)}
            accessibilityLabel="Cerrar menú"
          />
        </View>
      )}
    </View>
  );
}

function NativeTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          ...Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
        },
        headerShown: false,
      }}
      initialRouteName="home"
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="home" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventario",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="archive" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Dashboard",
          headerShown: true,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              showBackButton={false}
              showSearchButton={false}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          ),
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="compass-outline" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="administration"
        options={{
          title: "Administración",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="cog" iconColor={color} size={24} />
          ),
          headerShown: false,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              onSearchPress={() => console.log("Search pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          headerShown: true,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              showBackButton={false}
              showSearchButton={false}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          ),
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="account" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return Platform.OS === "web" ? <WebTabLayout /> : <NativeTabLayout />;
}
