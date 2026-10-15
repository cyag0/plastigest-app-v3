import { tokens } from "@/constants/tokens";
import { useColors } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { API_BASE_URL } from "@/utils/appConfig";
import {
  APP_VERSION,
  getAppVersionLabel,
  getLoadedWebBuildSignature,
} from "@/utils/appVersion";
import {
  bundleSignature,
  extractBundleScripts,
  isVersionBelow,
  parseNativeVersionInfo,
  type NativeVersionInfo,
} from "@/utils/versionCheck";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Teléfono: cada cuánto se vuelve a preguntar la versión mínima al regresar a
// la app (además de al abrirla).
const NATIVE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Web: cada cuánto se revisa si hay un despliegue nuevo con la pestaña
// visible, y cuánto tarda en volver a salir el aviso si se pospone.
const WEB_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const WEB_MIN_GAP_MS = 60 * 1000;
const WEB_SNOOZE_MS = 30 * 60 * 1000;

/**
 * Versiones mínima y más reciente del binario (GET app/version, ruta pública).
 * Sin el cliente de la app: no lleva token ni cabeceras de empresa/sucursal y
 * un fallo no pasa por los manejadores globales. null si no se pudo saber.
 */
async function fetchNativeVersionInfo(): Promise<NativeVersionInfo | null> {
  if (!API_BASE_URL) return null;
  try {
    const response = await axios.get(`${API_BASE_URL}/app/version`, {
      timeout: 8000,
      headers: { Accept: "application/json" },
    });
    return parseNativeVersionInfo(response.data);
  } catch {
    return null;
  }
}

/** Build web publicado en este momento (index.html recién pedido), o null. */
async function fetchDeployedWebBuildSignature(): Promise<string | null> {
  try {
    const response = await fetch("/", {
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    if (!response.ok) return null;
    return bundleSignature(extractBundleScripts(await response.text()));
  } catch {
    return null;
  }
}

/**
 * Avisos de versión (contrato GET app/version):
 *  - Teléfono: si el binario instalado es menor que la versión mínima que
 *    publica el servidor, pantalla de bloqueo "Actualiza la app" (una app
 *    vieja contra un API que ya cambió puede registrar datos mal). Si sólo
 *    hay una más reciente, un aviso que se puede cerrar.
 *  - Web: detecta un despliegue nuevo comparando el script del bundle cargado
 *    con el del index.html publicado, y ofrece recargar sin bloquear (puede
 *    haber una venta a medias).
 * Si no se puede consultar (sin red, servidor viejo), no se bloquea nada.
 */
export default function AppUpdateGate({
  children,
}: {
  children: React.ReactNode;
}) {
  if (Platform.OS === "web") {
    return (
      <>
        {children}
        <WebNewVersionBanner />
      </>
    );
  }
  return <NativeVersionGate>{children}</NativeVersionGate>;
}

function NativeVersionGate({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<NativeVersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [latestDismissed, setLatestDismissed] = useState(false);
  const lastCheckRef = useRef(0);

  // Un fallo (null) conserva lo último que se supo: ni bloquea ni desbloquea.
  const runCheck = useCallback(() => {
    return fetchNativeVersionInfo().then((result) => {
      lastCheckRef.current = Date.now();
      return result;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      runCheck().then((result) => {
        if (!cancelled && result) setInfo(result);
      });
    };
    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        Date.now() - lastCheckRef.current >= NATIVE_CHECK_INTERVAL_MS
      ) {
        check();
      }
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [runCheck]);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await runCheck();
      if (result) setInfo(result);
    } finally {
      setChecking(false);
    }
  };

  if (info && isVersionBelow(APP_VERSION, info.min_native_version)) {
    return (
      <UpdateRequiredScreen
        required={info.min_native_version as string}
        checking={checking}
        onRetry={retry}
      />
    );
  }

  const showLatest =
    !latestDismissed &&
    !!info &&
    isVersionBelow(APP_VERSION, info.latest_native_version);

  return (
    <>
      {children}
      {showLatest && (
        <UpdateBanner
          icon="cellphone-arrow-down"
          text={`Hay una versión nueva de GCStock (${info?.latest_native_version}). Actualízala desde la tienda cuando puedas.`}
          onDismiss={() => setLatestDismissed(true)}
        />
      )}
    </>
  );
}

function UpdateRequiredScreen({
  required,
  checking,
  onRetry,
}: {
  required: string;
  checking: boolean;
  onRetry: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles((c) => ({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: tokens.spacing[6],
      gap: tokens.spacing[3],
    },
    title: {
      ...tokens.typography.h2,
      color: c.text,
      textAlign: "center",
    },
    message: {
      ...tokens.typography.body,
      color: c.textSecondary,
      textAlign: "center",
      maxWidth: 420,
    },
    versions: {
      ...tokens.typography.caption,
      color: c.textMuted,
      textAlign: "center",
    },
    button: {
      marginTop: tokens.spacing[3],
      alignSelf: "stretch",
      maxWidth: 420,
      width: "100%",
    },
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <MaterialCommunityIcons
          name="cellphone-arrow-down"
          size={64}
          color={colors.primary}
        />
        <Text style={styles.title}>Actualiza la app</Text>
        <Text style={styles.message}>
          Esta versión de GCStock ya no es compatible con el servidor. Instala
          la versión más reciente desde la tienda de aplicaciones (o pide el
          instalador al administrador) para seguir trabajando.
        </Text>
        <Text style={styles.versions}>
          Tienes la versión {getAppVersionLabel()}; se necesita la {required} o
          posterior.
        </Text>
        <Button
          mode="contained"
          icon="refresh"
          onPress={onRetry}
          loading={checking}
          disabled={checking}
          style={styles.button}
        >
          Ya actualicé, reintentar
        </Button>
      </View>
    </SafeAreaView>
  );
}

function WebNewVersionBanner() {
  const [available, setAvailable] = useState(false);
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    // Con el servidor de desarrollo no hay bundle con hash que comparar.
    const loaded = getLoadedWebBuildSignature();
    if (__DEV__ || !loaded || typeof document === "undefined") return;

    let stopped = false;
    let lastCheck = 0;
    const check = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastCheck < WEB_MIN_GAP_MS) return;
      lastCheck = now;
      const deployed = await fetchDeployedWebBuildSignature();
      if (!stopped && deployed && deployed !== loaded) {
        stopped = true;
        setAvailable(true);
      }
    };

    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const interval = setInterval(onVisible, WEB_CHECK_INTERVAL_MS);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(interval);
    };
  }, []);

  // "Después": el aviso vuelve a salir pasado un rato.
  useEffect(() => {
    if (!snoozed) return;
    const timer = setTimeout(() => setSnoozed(false), WEB_SNOOZE_MS);
    return () => clearTimeout(timer);
  }, [snoozed]);

  if (!available || snoozed) return null;

  return (
    <UpdateBanner
      icon="update"
      text="Hay una nueva versión de GCStock."
      actionLabel="Recargar"
      onAction={() => window.location.reload()}
      dismissLabel="Después"
      onDismiss={() => setSnoozed(true)}
    />
  );
}

/** Aviso flotante abajo al centro; no tapa toda la pantalla. */
function UpdateBanner({
  icon,
  text,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissLabel?: string;
  onDismiss: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles((c) => ({
    wrapper: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: Platform.OS === "web" ? 16 : 72,
      alignItems: "center",
      paddingHorizontal: 12,
      zIndex: 1000,
    },
    banner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      maxWidth: 560,
      width: "100%",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.primary,
      ...tokens.shadow.lg,
    },
    text: {
      ...tokens.typography.bodySm,
      color: c.text,
      flex: 1,
    },
    close: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
  }));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.banner} accessibilityRole="alert">
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
        <Text style={styles.text}>{text}</Text>
        {actionLabel && onAction && (
          <Button mode="contained" compact onPress={onAction}>
            {actionLabel}
          </Button>
        )}
        {dismissLabel ? (
          <Button mode="text" compact onPress={onDismiss}>
            {dismissLabel}
          </Button>
        ) : (
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
            hitSlop={8}
            style={styles.close}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
