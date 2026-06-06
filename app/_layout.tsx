import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "react-native-reanimated";

import { SelectDataProvider } from "@/components/Form/AppProSelect";
import NavigationHandler from "@/components/NavigationHandler";
import palette from "@/constants/palette";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AlertsProvider } from "@/hooks/useAlerts";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { es, registerTranslation } from "react-native-paper-dates";
import PermissionsOverlay from "@/components/Debug/PermissionsOverlay";

registerTranslation("es", es);

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const theme = {
    ...MD3LightTheme,
    roundness: 2,
    colors: {
      ...MD3LightTheme.colors,
      primary: palette.primary,
      secondary: palette.secondary,
      surface: palette.surface,
      background: palette.background,
      onBackground: palette.text,
      onSurface: palette.textSecondary,
      surfaceVariant: palette.card,
      error: palette.error,
      outline: palette.border,
    },
  };

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
        <PaperProvider theme={theme}>
          <SelectDataProvider>
            <AlertsProvider>
              <NavigationHandler>
                <App />
              </NavigationHandler>
              {__DEV__ && <PermissionsOverlay />}
            </AlertsProvider>
          </SelectDataProvider>
        </PaperProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="login">
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(stacks)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
