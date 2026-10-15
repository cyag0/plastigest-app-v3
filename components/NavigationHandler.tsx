import { SafeAreaView } from "react-native-safe-area-context";
import Logo from "@/components/App/Logo";
import LocationSelector from "@/components/LocationSelector";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { notificationOpenedBus } from "@/utils/notificationEvents";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function NavigationHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    isLoading,
    isSwitchingLocation,
    hasCompanySelected,
    companies,
    isLoadingCompanies,
    selectedCompany,
    location,
    authError,
    checkAuthStatus,
    logout,
    sessionEndMessage,
    clearSessionEndMessage,
  } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const alerts = useAlerts();

  // La sesión se cerró sola (401): avisar por qué se regresó a login.
  useEffect(() => {
    if (!sessionEndMessage) return;
    alerts.warning(sessionEndMessage);
    clearSessionEndMessage();
    // alerts y clearSessionEndMessage no cambian el resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEndMessage]);

  useEffect(() => {
    if (isLoading || isSwitchingLocation) return; // No hacer nada mientras carga autenticación o cambia sucursal

    // No se pudo verificar la sesión (sin red / servidor caído): se muestra
    // la pantalla de reintento, no se manda a login (el token sigue guardado).
    if (!user && authError) return;

    const inLogin = segments[0] === "login" || !segments[0];

    // Rutas públicas accesibles sin sesión (login y flujo de recuperación
    // de contraseña). El resto de rutas redirige a /login cuando no hay
    // usuario autenticado.
    const publicRoutes = [
      "login",
      "forgot-password",
      "reset-password-code",
      "reset-password-confirm",
    ];
    const inPublicRoute = !segments[0] || publicRoutes.includes(segments[0]);

    // 1. Verificar autenticación
    if (!user) {
      if (!inPublicRoute) {
        // Usuario no autenticado intentando acceder a rutas protegidas
        // (también cuando la sesión expira a medio uso: AuthContext limpia
        // `user` al recibir un 401).
        router.replace("/login");
      }
      return;
    }

    if (user && inLogin) {
      // Usuario autenticado en login, redirigir a home
      router.replace("/(tabs)/home");
      return;
    }

    // 2. Verificar compañía (solo si está autenticado y no está cargando)
    if (user && !isLoadingCompanies) {
      // Si no hay compañía seleccionada pero hay compañías disponibles
      if (
        !hasCompanySelected &&
        companies.length > 0 &&
        segments[1] !== "selectCompany"
      ) {
        router.push("/(stacks)/selectCompany");
        return;
      }
    }
  }, [
    user,
    authError,
    isLoading,
    isSwitchingLocation,
    isLoadingCompanies,
    hasCompanySelected,
    companies.length,
    segments,
  ]);

  // Deep-linking de notificaciones push: cuando el usuario toca un push
  // (background, quit o web desde service worker), usePushNotifications
  // emite a este bus. Mapeamos event_type → ruta de la app.
  useEffect(() => {
    return notificationOpenedBus.subscribe((payload) => {
      // Si el usuario no esta autenticado todavia, dejamos que el guard
      // de arriba lo mande a login y luego la app podra re-navegar
      // cuando llegue un segundo tap, asi evitamos errores de router.
      if (!user) {
        console.log("Push recibido sin sesion activa, se ignora deep-link");
        return;
      }

      const target = resolveDeepLink(payload.eventType, payload.entityId);
      console.log("Deep-link a:", target, "desde evento:", payload.eventType);
      router.push(target as any);
    });
    // El router es estable segun expo-router, no es necesario re-suscribir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading || isSwitchingLocation) {
    return (
      <LoaderWithLogo
        message={isSwitchingLocation ? "Cambiando sucursal..." : "Cargando..."}
      />
    );
  }

  // No se pudo verificar la sesión y no hay usuario guardado con el cual
  // continuar: ofrecer reintentar en vez de cerrar la sesión.
  if (!user && authError) {
    return (
      <SessionErrorView
        message={authError}
        onRetry={checkAuthStatus}
        onLogout={logout}
      />
    );
  }

  // Si no hay usuario, mostrar children (login)
  if (!user) {
    return <>{children}</>;
  }

  // Si no hay compañía seleccionada, mostrar children (se redirigirá a selectCompany en el useEffect)
  if (!selectedCompany) {
    return <>{children}</>;
  }

  // Si no hay ubicación seleccionada, mostrar selector
  if (!location) {
    return (
      // Margen seguro: en Android (edge-to-edge) el selector quedaba bajo la
      // barra de estado.
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <LocationSelector onLocationSelected={() => {}} />
      </SafeAreaView>
    );
  }

  // Todo OK, mostrar la app
  return <>{children}</>;
}

function SessionErrorView({
  message,
  onRetry,
  onLogout,
}: {
  message: string;
  onRetry: () => void;
  onLogout: () => void;
}) {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.errorCard}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={56}
          color={palette.textSecondary}
        />
        <Text variant="titleLarge" style={styles.errorTitle}>
          Sin conexión con el servidor
        </Text>
        <Text variant="bodyMedium" style={styles.errorMessage}>
          {message}
        </Text>
        <Button
          mode="contained"
          icon="refresh"
          onPress={onRetry}
          style={styles.errorButton}
        >
          Reintentar
        </Button>
        <Button mode="text" onPress={onLogout} style={styles.errorButton}>
          Iniciar sesión de nuevo
        </Button>
      </View>
    </View>
  );
}

function LoaderWithLogo({ message }: { message: string }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View
        style={[
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Logo variant="mark" size={80} />

        <Text
          variant="displaySmall"
          style={{
            color: palette.primary,
            fontWeight: "bold",
            marginTop: 12,
          }}
        >
          GCStock
        </Text>

        <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 24 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: palette.text,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  errorCard: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: palette.text,
    fontWeight: "700",
    textAlign: "center",
  },
  errorMessage: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  errorButton: {
    alignSelf: "stretch",
  },
});

// Mapea los event_type emitidos por los templates del backend a rutas de
// la app. Si no reconocemos el evento o falta el entityId, caemos a la
// lista de notificaciones para que el usuario tenga contexto.
function resolveDeepLink(
  eventType: string | undefined,
  entityId: string | undefined,
): string {
  const fallback = "/(tabs)/notifications";

  if (!eventType || !entityId) return fallback;

  switch (eventType) {
    case "task_event":
      return `/(tabs)/tasks/${entityId}`;
    case "purchase_update":
      return `/(tabs)/home/purchases/${entityId}`;
    case "low_stock":
    case "inventory_adjustment":
      return `/(tabs)/inventory/products/${entityId}`;
    case "inventory_count_discrepancy":
      return `/(tabs)/inventory/weekly-inventory/${entityId}`;
    default:
      return fallback;
  }
}
