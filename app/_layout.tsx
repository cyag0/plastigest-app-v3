import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";

import CompanyRequiredWrapper from "@/components/CompanyRequiredWrapper";
import { SelectDataProvider } from "@/components/Form/AppProSelect";
import NavigationHandler from "@/components/NavigationHandler";
import palette from "@/constants/palette";
import { AuthProvider } from "@/contexts/AuthContext";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { es, registerTranslation } from "react-native-paper-dates";

registerTranslation("es", es);

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
    <PaperProvider theme={theme}>
      <AuthProvider>
        <SelectDataProvider>
          <NavigationHandler>
            <CompanyRequiredWrapper>
              <App />
            </CompanyRequiredWrapper>
          </NavigationHandler>
        </SelectDataProvider>
      </AuthProvider>
    </PaperProvider>
  );
}

function App() {
  console.log("Rendering Root Stack Layout");

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="login">
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(stacks)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
