import palette, { type Palette } from "@/constants/palette";
import { useColors } from "@/contexts/ThemeContext";
import { reportClientError } from "@/utils/errorReporting";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter, type ErrorBoundaryProps } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Último recurso: envuelve toda la app en app/_layout.tsx (sesión, tema y
 * navegación). Los errores de una pantalla los atrapan antes los
 * ErrorBoundary de cada sección (RouteErrorBoundary), que dejan vivo el menú.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportClientError(error, {
      source: "root-boundary",
      componentStack: info.componentStack ?? undefined,
    });
    if (__DEV__) {
      console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    // En web se vuelve a cargar desde el inicio: reintentar en la misma URL
    // repetía el mismo error.
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.replace("/");
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          colors={palette}
          error={this.state.error}
          title="Algo salió mal"
          message="Ocurrió un error inesperado. Ya se avisó al administrador; vuelve a intentarlo."
          primaryLabel={Platform.OS === "web" ? "Volver al inicio" : "Reintentar"}
          onPrimary={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Al montarse el aviso, el navegador de la sección se desmonta y puede
// cambiar la ruta (vuelve a la raíz de la sección). Los cambios dentro de este
// margen no son del usuario.
const NAVIGATION_SETTLE_MS = 500;

/**
 * ErrorBoundary por sección para expo-router: los _layout de cada grupo lo
 * exportan como `ErrorBoundary` y una pantalla que truena sólo reemplaza esa
 * sección; el menú lateral, las pestañas y el resto de la app siguen.
 *
 * "Reintentar" vuelve a montar la sección; "Ir al inicio" lleva a Inicio. Si
 * el usuario navega a otra ruta (menú, pestañas, atrás del navegador), la
 * sección se vuelve a montar sola: la pantalla nueva no es la que falló.
 */
export function RouteErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const baselineRef = useRef(pathname);
  const settledRef = useRef(false);

  useEffect(() => {
    reportClientError(error, {
      source: "route-boundary",
      route: baselineRef.current,
    });
  }, [error]);

  useEffect(() => {
    const timer = setTimeout(() => {
      settledRef.current = true;
    }, NAVIGATION_SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pathname === baselineRef.current) return;
    if (!settledRef.current) {
      baselineRef.current = pathname;
      return;
    }
    void retry();
  }, [pathname, retry]);

  const goHome = () => {
    router.replace("/(tabs)/home" as any);
    void retry();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ErrorFallback
        colors={colors}
        error={error}
        title="Esta pantalla tuvo un problema"
        message="Ocurrió un error inesperado y ya se avisó al administrador. El resto de la app sigue funcionando."
        primaryLabel="Reintentar"
        onPrimary={() => void retry()}
        secondaryLabel="Ir al inicio"
        onSecondary={goHome}
      />
    </SafeAreaView>
  );
}

function ErrorFallback({
  colors,
  error,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  colors: Palette;
  error: Error | null;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={64}
        color={colors.error}
      />
      <Text variant="titleLarge" style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {__DEV__ && error && (
        <Text variant="bodySmall" style={[styles.devError, { color: colors.error }]}>
          {error.message}
        </Text>
      )}
      <Button
        mode="contained"
        onPress={onPrimary}
        buttonColor={colors.primary}
        style={styles.button}
      >
        {primaryLabel}
      </Button>
      {secondaryLabel && onSecondary && (
        <Button
          mode="text"
          onPress={onSecondary}
          textColor={colors.primary}
          style={styles.button}
        >
          {secondaryLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: {
    fontWeight: "bold",
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    maxWidth: 420,
  },
  devError: {
    textAlign: "center",
    fontFamily: "monospace",
    marginTop: 4,
  },
  button: {
    marginTop: 8,
    minWidth: 160,
  },
});
