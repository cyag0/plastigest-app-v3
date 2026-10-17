import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Button, Text } from "react-native-paper";

// El aviso se puede cerrar; vuelve a salir después de una semana.
const DISMISS_KEY = "notification_banner_dismissed_at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function wasDismissedRecently(): boolean {
  try {
    const at = Number(globalThis.localStorage?.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    globalThis.localStorage?.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Sin almacenamiento (modo privado): sólo se oculta en esta visita.
  }
}

/**
 * Banner que se muestra cuando el permiso de notificaciones push aun no ha
 * sido concedido ("default") o fue bloqueado ("denied"). Es importante
 * porque `Notification.requestPermission()` solo funciona desde un user
 * gesture, asi que necesitamos un boton que el usuario pueda presionar.
 *
 * En native (iOS/Android), la primera vez que el sistema operativo pide
 * permiso lo hace el SDK de RNFirebase al llamar getToken(), por lo que
 * este banner es util sobre todo para web y para el caso "denied".
 */
export default function NotificationPermissionBanner() {
  const {
    notificationPermission,
    requestNotificationPermission,
  } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissedRecently);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Solo mostramos banner en web (en native el sistema operativo se encarga)
  if (Platform.OS !== "web") return null;
  if (notificationPermission === "granted") return null;
  if (notificationPermission === "unsupported") return null;
  if (dismissed) return null;

  const handleRequest = async () => {
    if (requesting) return;
    try {
      setRequesting(true);
      await requestNotificationPermission();
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    rememberDismissal();
    setDismissed(true);
  };

  const isDenied = notificationPermission === "denied";
  const accent = isDenied ? colors.warning : colors.primary;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDenied ? colors.warningSoft : colors.primarySoft,
          borderColor: accent + "55",
        },
      ]}
    >
      <MaterialCommunityIcons
        name={isDenied ? "bell-off-outline" : "bell-ring-outline"}
        size={22}
        color={isDenied ? colors.warningStrong : colors.primary}
      />

      <View style={styles.textContainer}>
        <Text variant="titleSmall" style={styles.title}>
          {isDenied ? "Notificaciones desactivadas" : "Activa las notificaciones"}
        </Text>
        <Text variant="bodySmall" style={styles.description}>
          {isDenied
            ? "Para recibir avisos de tareas y stock bajo, permítelas desde el ícono del candado en la barra de direcciones."
            : "Te avisaremos al instante de tareas, stock bajo, compras y transferencias."}
        </Text>
      </View>

      {!isDenied && (
        <Button
          mode="contained"
          buttonColor={colors.primary}
          textColor={colors.primaryForeground}
          onPress={handleRequest}
          loading={requesting}
          disabled={requesting}
          compact
        >
          Activar
        </Button>
      )}

      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
        hitSlop={8}
        style={styles.close}
      >
        <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: c.text,
    fontWeight: "600",
  },
  description: {
    color: c.textSecondary,
    marginTop: 2,
  },
  close: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
}));
