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
import { View } from "react-native";

registerTranslation("es", es);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ErrorBoundary>
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
        </AlertsProvider>
        {/* Renderizar los dialogs (ConfirmDialog, AlertSnackbar) al
            FINAL del arbol. Como usan <Portal> de Paper, todos los
            portales viven en el mismo host; los que se montan al
            final del arbol se renderizan al final de ese host y, por
            tanto, quedan por encima de cualquier otro modal abierto
            (p. ej. el ContextSwitcherModal del sidebar). */}
        <AlertsDialogs />
      </SelectDataProvider>
    </PaperProvider>
  );
}
