import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { Appbar } from "react-native-paper";

import AppBar from "@/components/App/AppBar";
import NavigationSidebar from "@/components/App/NavigationSidebar";
import { routeGuardLayout } from "@/components/App/RoutePermissionGuard";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useThemedStyles } from "@/hooks/useThemedStyles";

// Error del menú/pestañas o de una pantalla sin sección propia (perfil,
// reportes, preferencias): se reemplaza esta área y el error se reporta.
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

// Revisa el permiso de cada pantalla con el mapa central (ver
// RoutePermissionGuard): sin permiso muestra "No tienes permiso…". Las
// secciones con su propio layout (home, inventory…) se revisan ahí.
const screenLayout = routeGuardLayout("(tabs)");

/**
 * Pantallas para la versión web. Se reutiliza tanto cuando el
 * sidebar es inline (desktop/tablet) como cuando es overlay (móvil),
 * por eso vive en una constante.
 */
function WebTabs() {
  return (
    <Tabs
      screenLayout={screenLayout}
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
              showSearchButton={false}
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
  // el drawer "pegado" sobre un sidebar inline. Se ajusta durante el
  // render (sin efecto que vuelva a pintar).
  const [wasNarrow, setWasNarrow] = useState(isNarrow);
  if (wasNarrow !== isNarrow) {
    setWasNarrow(isNarrow);
    if (!isNarrow) setDrawerOpen(false);
  }

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
    // Queda dentro del hueco que el AppBar reserva a la izquierda en web
    // angosta (paddingLeft 52), a la altura del header.
    hamburger: {
      position: "absolute" as const,
      top: 4,
      left: 6,
      zIndex: 50,
      width: 40,
      height: 40,
      borderRadius: 9999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      ...tokens.shadow.md,
    },
    // absoluteFillObject ya no existe en RN 0.85 (en web sí, pero tipaba mal).
    overlayRoot: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
  // Pestañas que el usuario no puede abrir (regla de su pantalla en el mapa
  // central): se oculta el botón; si llega por un enlace, el guard muestra
  // "No tienes permiso…". En web lo mismo lo hace el menú lateral.
  const { canAccessRoute } = useCan();
  // En SDK 56 `href: null` solo oculta el botón (la ruta se sigue abriendo
  // por enlace), como en notificaciones, tareas y preferencias.
  const hiddenUnless = (route: string) =>
    canAccessRoute(route) ? {} : { href: null };

  return (
    <Tabs
      screenLayout={screenLayout}
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
          ...hiddenUnless("/(tabs)/inventory"),
          title: "Inventario",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="archive" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          ...hiddenUnless("/(tabs)/reports"),
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
          ...hiddenUnless("/(tabs)/administration"),
          title: "Administración",
          // En la barra inferior no cabe completo (5 pestañas en un teléfono).
          tabBarLabel: "Admin",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="cog" iconColor={color} size={24} />
          ),
          headerShown: false,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              showSearchButton={false}
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
