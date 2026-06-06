import LocationSelector from "@/components/LocationSelector";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { notificationOpenedBus } from "@/utils/notificationEvents";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
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
  } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading || isSwitchingLocation) return; // No hacer nada mientras carga autenticación o cambia sucursal

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "(stacks)";
    const inLogin = segments[0] === "login" || !segments[0];

    // 1. Verificar autenticación
    if (!user && inAuthGroup) {
      // Usuario no autenticado intentando acceder a rutas protegidas
      router.replace("/login");
      return;
    }

    if (!user && !inAuthGroup) {
      router.replace("/login");
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
      <View style={styles.container}>
        <LocationSelector onLocationSelected={() => {}} />
      </View>
    );
  }

  // Todo OK, mostrar la app
  return <>{children}</>;
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
        <MaterialCommunityIcons
          name="package-variant"
          size={80}
          color={palette.error}
        />

        <Text
          variant="displaySmall"
          style={{
            color: palette.error,
            fontWeight: "bold",
          }}
        >
          PlastiGest
        </Text>

        <Text variant="bodyLarge" style={styles.loadingText}>
          {message}
        </Text>
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
});

// Mapea los event_type emitidos por los templates del backend a rutas de
// la app. Si no reconocemos el evento o falta el entityId, caemos a la
// lista de notificaciones para que el usuario tenga contexto.
function resolveDeepLink(
  eventType: string | undefined,
  entityId: string | undefined,
): string {
  const fallback = "/(stacks)/notifications";

  if (!eventType || !entityId) return fallback;

  switch (eventType) {
    case "task_event":
      return `/(stacks)/tasks/${entityId}`;
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
