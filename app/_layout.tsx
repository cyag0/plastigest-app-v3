import "@/utils/silenceLogs";
import { applyGlobalFont, WEB_FONT_STACK } from "@/utils/globalFont";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import "react-native-reanimated";

import AppUpdateGate from "@/components/App/AppUpdateGate";
import ConfigErrorScreen from "@/components/App/ConfigErrorScreen";
import { SelectDataProvider } from "@/components/Form/AppProSelect";
import NavigationHandler from "@/components/NavigationHandler";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertsDialogs, AlertsProvider } from "@/hooks/useAlerts";
import { API_CONFIG_ERROR } from "@/utils/appConfig";
import {
  installGlobalErrorHandlers,
  setErrorReportingRoute,
} from "@/utils/errorReporting";
import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
} from "react-native-paper";
import { es, registerTranslation } from "react-native-paper-dates";
import PermissionsOverlay from "@/components/Debug/PermissionsOverlay";
import React, { useEffect } from "react";
import { Platform, StatusBar, View } from "react-native";

// Antes de cualquier render: Text/TextInput con Inter (ver utils/globalFont).
applyGlobalFont();

// Errores que nada atrapa (window.onerror, promesas sin catch, ErrorUtils):
// se reportan al servidor (utils/errorReporting).
installGlobalErrorHandlers();

// Inter para Paper. En web la familia CSS con todos sus grosores; en el
// teléfono la regular (el envoltorio de Text cambia la familia según el grosor).
const PAPER_FONTS = configureFonts({
  config: { fontFamily: Platform.OS === "web" ? WEB_FONT_STACK : "Inter_400Regular" },
});

// En el teléfono Inter va dentro de la app (funciona sin internet). En web
// se carga de Google Fonts en public/index.html (woff2, mucho más ligero).
const INTER_NATIVE: Record<string, number> =
  Platform.OS === "web"
    ? {}
    : {
        Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
        Inter_500Medium: require("@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"),
        Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
        Inter_700Bold: require("@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"),
        Inter_800ExtraBold: require("@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf"),
      };

registerTranslation("es", es);

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    ...INTER_NATIVE,
    // Fuentes de iconos cargadas desde assets/fonts (copia local) en vez de
    // node_modules/@expo/...: Cloudflare Pages no sirve rutas con "@", por lo
    // que los .ttf de los iconos no cargaban en web. Estos nombres de familia
    // ("material-community", "ionicons") son los que usa @expo/vector-icons.
    "material-community": require("../assets/fonts/MaterialCommunityIcons.ttf"),
    ionicons: require("../assets/fonts/Ionicons.ttf"),
  });

  if (fontError) {
    // Si una fuente no carga (404 en el hosting web, red lenta) la app sigue:
    // solo faltarían esos íconos/tipografía. Antes se quedaba en blanco.
    console.warn("No se pudieron cargar las fuentes:", fontError);
  }

  if (!loaded && !fontError) {
    // En web (y en desarrollo) las fuentes se cargan de forma asíncrona.
    return null;
  }

  // Build sin dirección del servidor (o apuntando a localhost): se explica en
  // pantalla en vez de montar la sesión, que mandaría peticiones a otro lado.
  if (API_CONFIG_ERROR) {
    return <ConfigErrorScreen message={API_CONFIG_ERROR} />;
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

  // Ruta actual para adjuntarla a los reportes de errores.
  const pathname = usePathname();
  useEffect(() => {
    setErrorReportingRoute(pathname);
  }, [pathname]);
  const base = mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  const theme = {
    ...base,
    fonts: PAPER_FONTS,
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
      onSurfaceVariant: colors.textSecondary,
      error: colors.error,
      errorContainer: colors.errorSoft,
      outline: colors.border,
      outlineVariant: colors.border,
      // Sin esto Paper usa sus tonos por defecto (lila en chips
      // seleccionados, menús y switches): se ven de plantilla.
      primaryContainer: colors.primarySoft,
      onPrimaryContainer: colors.primaryHover,
      secondaryContainer: colors.primarySoft,
      onSecondaryContainer: colors.primaryHover,
      tertiary: colors.accent,
      tertiaryContainer: colors.accentSoft,
      onTertiaryContainer: colors.accent,
      backdrop: colors.overlay,
      // Fondos por nivel de elevación (la sombra la pone el prop
      // `elevation`, no estos colores). Cards y botones quedan planos
      // (transparentes), pero los menús (nivel 2) y los diálogos y
      // buscadores (nivel 3) necesitan fondo: con "transparent" el menú del
      // punto de venta y los Dialog de Paper se veían encimados al contenido.
      elevation: {
        level0: "transparent",
        level1: "transparent",
        level2: colors.surface,
        level3: colors.surface,
        level4: "transparent",
        level5: "transparent",
      },
    },
  };

  return (
    <PaperProvider theme={{
      ...theme,
    }}>
      {/* Versión mínima del teléfono / aviso de despliegue nuevo en web. */}
      <AppUpdateGate>
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
                {/* Desde SDK 58 los navegadores ya no aceptan
                    initialRouteName: "/" lo resuelve app/index.tsx. No se
                    usa unstable_settings.anchor porque metería login debajo
                    de los enlaces profundos. */}
                <Stack screenOptions={{ headerShown: false }}>
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
      </AppUpdateGate>
    </PaperProvider>
  );
}
