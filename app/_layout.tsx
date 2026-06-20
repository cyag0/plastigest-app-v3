import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "react-native-reanimated";

import { SelectDataProvider } from "@/components/Form/AppProSelect";
import NavigationHandler from "@/components/NavigationHandler";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertsDialogs, AlertsProvider } from "@/hooks/useAlerts";
import {
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
} from "react-native-paper";
import { es, registerTranslation } from "react-native-paper-dates";
import PermissionsOverlay from "@/components/Debug/PermissionsOverlay";
import React from "react";
import { StatusBar, View } from "react-native";

registerTranslation("es", es);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    // Fuentes de iconos cargadas desde assets/fonts (copia local) en vez de
    // node_modules/@expo/...: Cloudflare Pages no sirve rutas con "@", por lo
    // que los .ttf de los iconos no cargaban en web. Estos nombres de familia
    // ("material-community", "ionicons") son los que usa @expo/vector-icons.
    "material-community": require("../assets/fonts/MaterialCommunityIcons.ttf"),
    ionicons: require("../assets/fonts/Ionicons.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ErrorBoundary>
      <StatusBar
        barStyle="dark-content" // texto blanco
      />

      {/* AuthProvider DEBE estar arriba de PaperProvider porque el
          <Portal> de react-native-paper renderiza su contenido fuera del
          subarbol de children del PaperProvider, pero dentro del PortalHost
          que este monta. Si AuthProvider estuviera abajo, el contenido
          del Menu (popover de notificaciones) no tendria acceso al context
          de autenticacion y useAuth() lanzaria "must be used within an
          AuthProvider". Moviendolo aqui hace que cualquier portal quede
          dentro del contexto. */}
      <AuthProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

/**
 * Componente interno que tiene acceso al ThemeContext y arma
 * el PaperProvider con la paleta correspondiente al modo.
 *
 * Ademas envuelve la navegacion con un View cuyo background
 * usa colors.background, para que las pantallas que aun no
 * migraron al theme hook sigan el fondo del tema en vez de
 * mostrar el slate-50 hardcodeado de la paleta light.
 */
function ThemedApp() {
  const { mode, colors } = useTheme();
  const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  const theme = {
    ...base,
    roundness: 2,
    colors: {
      ...base.colors,
      primary: colors.primary,
      secondary: colors.secondary,
      surface: colors.surface,
      background: colors.background,
      onBackground: colors.text,
      onSurface: colors.textSecondary,
      surfaceVariant: colors.surfaceMuted,
      error: colors.error,
      outline: colors.border,
      // Look plano global: se anulan los elevation levels para que
      // Card, Button, FAB, Surface elevado, etc. no proyecten sombra.
      elevation: {
        level0: "transparent",
        level1: "transparent",
        level2: "transparent",
        level3: "transparent",
        level4: "transparent",
        level5: "transparent",
      },
    },
  };

  return (
    <PaperProvider theme={{
      ...theme,
    }}>
      <SelectDataProvider>
        <AlertsProvider>
          <NavigationHandler>
            {/* View raiz: fondo del tema actual. Garantiza que TODAS
                las pantallas tengan el bg correcto sin migrar cada
                una individualmente. Las vistas que usen backgroundColor
                explicito en su contenedor sobrescribiran este fondo. */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.background,
              }}
            >
              <Stack
                screenOptions={{ headerShown: false }}
                initialRouteName="login"
              >
                <Stack.Screen
                  name="login"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="forgot-password"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="reset-password-code"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="reset-password-confirm"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="(stacks)"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="+not-found" />
              </Stack>
            </View>
            {__DEV__ && <PermissionsOverlay />}
          </NavigationHandler>
          {/* Renderizar los dialogs (ConfirmDialog, AlertSnackbar) al
              FINAL del arbol, pero DENTRO de <AlertsProvider> para que
              AlertsDialogs pueda leer las refs imperativas del provider
              (si queda fuera, useContext(AlertsRefsContext) devuelve null
              y AlertsDialogs retorna null — los portales nunca se montan
              y todos los alerts.* se vuelven no-op silenciosos).
              Como usan <Portal> de Paper, todos los portales viven en el
              mismo host del PaperProvider; al estar al final del subarbol
              quedan por encima de cualquier otro modal abierto (p. ej. el
              ContextSwitcherModal del sidebar). */}
          <AlertsDialogs />
        </AlertsProvider>
      </SelectDataProvider>
    </PaperProvider>
  );
}
