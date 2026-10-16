import EmptyState from "@/components/App/EmptyState";
import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import {
  fetchNotification,
  markNotificationReadQuietly,
} from "@/components/Notifications/notificationRequests";
import { useLinkedRecordOpener } from "@/components/Notifications/useLinkedRecordOpener";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { goBack } from "@/utils/navigation";
import services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationDetailScreen() {
  const { id, open } = useLocalSearchParams<{ id: string; open?: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { loadUnreadNotificationsCount } = useAuth();
  const { open: openLinkedRecord } = useLinkedRecordOpener();

  const [notification, setNotification] = useState<App.Entities.Notification | null>(null);
  const [loading, setLoading] = useState(true);
  // "missing" = ya no existe (se borró); "error" = no se pudo cargar.
  const [problem, setProblem] = useState<"missing" | "error" | null>(null);
  const loadedOnceRef = useRef(false);

  // Push tocado (?open=1): el registro del aviso se abre solo al cargar. Una
  // vez: el parámetro se quita para que al volver o recargar no se repita.
  const [autoOpen] = useState(open === "1");
  useEffect(() => {
    if (open === "1") router.setParams({ open: undefined } as any);
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notificationId = Number(id);

  const loadNotification = useCallback(async () => {
    if (!notificationId) {
      setProblem("missing");
      setLoading(false);
      return;
    }

    try {
      // El loader de pantalla completa solo la primera vez: al volver del
      // registro relacionado se refresca sin desmontar el detalle.
      if (!loadedOnceRef.current) setLoading(true);
      // Sin aviso global: una notificación borrada se explica aquí.
      const item = await fetchNotification(notificationId);
      setNotification(item);
      setProblem(null);
      loadedOnceRef.current = true;

      if (!item.is_read) {
        // En segundo plano: si falla, el detalle se ve igual.
        setNotification({ ...item, is_read: true, read_at: new Date().toISOString() });
        markNotificationReadQuietly(item.id)
          .catch(() => undefined)
          .finally(() => {
            loadUnreadNotificationsCount();
          });
      }
      // loadUnreadNotificationsCount es estable (useCallback en AuthContext):
      // refrescar el contador ya no vuelve a disparar esta carga.
    } catch (error: any) {
      if (loadedOnceRef.current) return; // ya se muestra: se queda como estaba
      setProblem(error?.response?.status === 404 ? "missing" : "error");
    } finally {
      setLoading(false);
    }
  }, [loadUnreadNotificationsCount, notificationId]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!notification || problem) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
        <View style={styles.centered}>
          {problem === "error" ? (
            <EmptyState
              icon="cloud-off-outline"
              title="No se pudo cargar la notificación"
              description="Revisa tu conexión e intenta de nuevo."
              actionLabel="Reintentar"
              onAction={loadNotification}
            />
          ) : (
            <EmptyState
              icon="bell-off-outline"
              title="Esta notificación ya no existe"
              description="Pudo haberse eliminado."
              actionLabel="Ver notificaciones"
              onAction={() => router.replace("/(tabs)/notifications" as any)}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <NotificationDetailContent
        notification={notification}
        onDelete={handleDelete}
        onOpenLink={(link) => openLinkedRecord(link)}
        autoOpenLink={autoOpen}
      />
    </SafeAreaView>
  );
}

const styles = {
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
};
