import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const alerts = useAlerts();
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
      const item: App.Entities.Notification = response.data?.data ?? response.data;
      setNotification(item);

      if (!item.is_read) {
        await services.notifications.markAsRead(item.id);
        setNotification({ ...item, is_read: true, read_at: new Date().toISOString() });
        loadUnreadNotificationsCount();
      }
    } catch {
      alerts.error("Error al cargar la notificacion");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [alerts, loadUnreadNotificationsCount, notificationId, router]);

  useFocusEffect(
    useCallback(() => {
      loadNotification();
    }, [loadNotification]),
  );

  const handleDelete = async () => {
    if (!notificationId) {
      return;
    }

    const confirmed = await alerts.confirm("Eliminar esta notificacion?", {
      title: "Confirmar eliminacion",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    try {
      await services.notifications.destroy(notificationId);
      alerts.success("Notificacion eliminada");
      loadUnreadNotificationsCount();
      router.back();
    } catch {
      alerts.error("Error al eliminar la notificacion");
    }
  };

  if (loading || !notification) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Cargando notificacion...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <NotificationDetailContent
        notification={notification}
        onBack={() => router.back()}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: "transparent" as any,
  },
  loadingText: {
    color: palette.textSecondary,
  },
};
