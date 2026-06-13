import { useAuth } from "@/contexts/AuthContext";
import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

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

  // Solo mostramos banner en web (en native el sistema operativo se encarga)
  if (Platform.OS !== "web") return null;
  if (notificationPermission === "granted") return null;
  if (notificationPermission === "unsupported") return null;

  const handleRequest = async () => {
    if (requesting) return;
    try {
      setRequesting(true);
      await requestNotificationPermission();
    } finally {
      setRequesting(false);
    }
  };

  const isDenied = notificationPermission === "denied";

  return (
    <Surface
      style={[
        styles.container,
        { backgroundColor: isDenied ? palette.error : palette.primary },
      ]}
      elevation={2}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={isDenied ? "bell-off-outline" : "bell-ring-outline"}
          size={24}
          color="#fff"
        />
      </View>

      <View style={styles.textContainer}>
        <Text variant="titleSmall" style={styles.title}>
          {isDenied ? "Notificaciones bloqueadas" : "Recibe notificaciones"}
        </Text>
        <Text variant="bodySmall" style={styles.description}>
          {isDenied
            ? "Tu navegador esta bloqueando las notificaciones. Cambialo desde el icono de candado en la barra de direcciones."
            : "Te avisaremos al instante sobre tareas, stock bajo, ventas y mas."}
        </Text>
      </View>

      {!isDenied && (
        <Button
          mode="contained"
          buttonColor="#fff"
          textColor={palette.primary}
          onPress={handleRequest}
          loading={requesting}
          disabled={requesting}
          compact
        >
          Activar
        </Button>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 8,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontWeight: "600",
  },
  description: {
    color: "#fff",
    opacity: 0.9,
    marginTop: 2,
  },
});
