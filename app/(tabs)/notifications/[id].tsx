import { goBack } from "@/utils/navigation";
import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { loadUnreadNotificationsCount } = useAuth();

  const [notification, setNotification] = useState<App.Entities.Notification | null>(null);
  const [loading, setLoading] = useState(true);

  const notificationId = Number(id);

  const loadNotification = useCallback(async () => {
    if (!notificationId) {
      return;
    }

    try {
      setLoading(true);
      const response = await services.notifications.show(notificationId);
      // El show devuelve la notificación sin envolver y ésta trae su propio
      // campo `data` (el payload del evento): no confundirlo con un wrapper.
      const body = response.data as any;
      const item: App.Entities.Notification =
        body && body.id !== undefined ? body : body?.data;
      setNotification(item);

      if (!item.is_read) {
        await services.notifications.markAsRead(item.id);
        setNotification({ ...item, is_read: true, read_at: new Date().toISOString() });
        loadUnreadNotificationsCount();
      }
      // loadUnreadNotificationsCount es estable (useCallback en AuthContext):
      // refrescar el contador ya no vuelve a disparar esta carga.
    } catch {
      alerts.error("Error al cargar la notificación");
      goBack();
    } finally {
      setLoading(false);
    }
  }, [alerts, loadUnreadNotificationsCount, notificationId]);

  useFocusEffect(
    useCallback(() => {
      loadNotification();
    }, [loadNotification]),
  );

  const handleDelete = async () => {
    if (!notificationId) {
      return;
    }

    const confirmed = await alerts.confirm("¿Eliminar esta notificación?", {
      title: "Confirmar eliminación",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    try {
      await services.notifications.destroy(notificationId);
      alerts.success("Notificación eliminada");
      loadUnreadNotificationsCount();
      goBack();
    } catch {
      alerts.error("Error al eliminar la notificación");
    }
  };

  if (loading || !notification) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <NotificationDetailContent
        notification={notification}
        onDelete={handleDelete}
        onOpenLink={(route) => router.push(route as any)}
      />
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
};
