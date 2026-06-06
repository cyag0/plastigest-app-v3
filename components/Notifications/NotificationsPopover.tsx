import NotificationItem from "@/components/Notifications/NotificationItem";
import SkeletonLoader from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import services from "@/utils/services";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Divider, Icon, Text } from "react-native-paper";

const POPOVER_LIMIT = 5;

export interface NotificationsPopoverProps {
  /**
   * Se dispara cuando el usuario elige una notificacion. El padre debe
   * encargarse de cerrar el Menu y navegar al detalle. Esto desacopla el
   * popover del router/menu y lo hace facil de testear.
   */
  onItemPress: (notification: App.Entities.Notification) => void;
  /**
   * Se dispara cuando el usuario hace click en "Ver todas" del footer.
   * El padre cierra el menu y navega a la lista completa.
   */
  onViewAllPress: () => void;
}

/**
 * Contenido del popover de notificaciones. Renderiza las POPOVER_LIMIT
 * mas recientes en formato compacto, con header (titulo + marcar todas)
 * y footer (link a la lista completa). La carga de datos es lazy:
 * solo se hace al primer mount.
 */
export default function NotificationsPopover({
  onItemPress,
  onViewAllPress,
}: NotificationsPopoverProps) {
  const { loadUnreadNotificationsCount } = useAuth();

  const [notifications, setNotifications] = useState<App.Entities.Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await services.notifications.index({ all: true });
      // El servicio puede responder {data: [...]} o [...] segun el endpoint
      const data: App.Entities.Notification[] = Array.isArray(response.data)
        ? response.data
        : (response.data?.data ?? []);
      // Solo las POPOVER_LIMIT mas recientes
      setNotifications(data.slice(0, POPOVER_LIMIT));
    } catch (error) {
      console.warn("Error al cargar notificaciones en popover:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await services.notifications.markAllAsRead();
      setNotifications((current) =>
        current.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
      );
      loadUnreadNotificationsCount();
    } catch (error) {
      console.warn("Error al marcar todas como leidas:", error);
    }
  };

  const handleItemPress = (notification: App.Entities.Notification) => {
    // Optimistic update local para que el punto "NUEVA" desaparezca al
    // instante; si el padre falla, el contador del backend manda.
    setNotifications((current) =>
      current.map((n) =>
        n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
      ),
    );
    onItemPress(notification);
  };

  const handleItemMarkAsRead = async (id: number, isRead: boolean) => {
    try {
      if (isRead) {
        await services.notifications.markAsUnread(id);
      } else {
        await services.notifications.markAsRead(id);
      }
      setNotifications((current) =>
        current.map((n) =>
          n.id === id
            ? { ...n, is_read: !isRead, read_at: !isRead ? new Date().toISOString() : null }
            : n,
        ),
      );
      loadUnreadNotificationsCount();
    } catch (error) {
      console.warn("Error al actualizar la notificacion:", error);
    }
  };

  // El popover no expone delete: es una accion destructiva que pertenece
  // a la lista completa. Pasamos un no-op a NotificationItem porque su prop
  // es requerida, aunque en modo compact los botones de accion no se
  // renderizan.
  const handleItemDelete = async (_id: number) => undefined;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon source="bell-outline" size={20} color={palette.primary} />
          <Text variant="titleMedium" style={styles.headerTitle}>
            Notificaciones
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            hitSlop={8}
          >
            <Icon source="check-all" size={16} color={palette.primary} />
            <Text variant="labelSmall" style={styles.markAllText}>
              Marcar todas
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Divider style={styles.divider} />

      {/* Body */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonLoader width={36} height={36} borderRadius={6} />
                <View style={styles.skeletonTextBlock}>
                  <SkeletonLoader width="60%" height={12} />
                  <SkeletonLoader width="90%" height={14} style={{ marginTop: 6 }} />
                </View>
              </View>
            ))}
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon source="bell-off-outline" size={40} color={palette.textSecondary} />
            <Text variant="bodyMedium" style={styles.emptyText}>
              No tienes notificaciones
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((item, index) => (
              <NotificationItem
                key={item.id}
                item={item}
                index={index}
                compact
                onPress={handleItemPress}
                handleMarkAsRead={handleItemMarkAsRead}
                handleDelete={handleItemDelete}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Footer */}
      {!loading && notifications.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <TouchableOpacity style={styles.footer} onPress={onViewAllPress}>
            <Text variant="labelLarge" style={styles.footerText}>
              Ver todas las notificaciones
            </Text>
            <Icon source="arrow-right" size={16} color={palette.primary} />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 380,
    maxHeight: 520,
    backgroundColor: palette.background,
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontWeight: "700",
    color: palette.text,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  markAllText: {
    color: palette.primary,
    fontWeight: "700",
  },
  divider: {
    backgroundColor: palette.border,
  },
  body: {
    flex: 1,
    minHeight: 120,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    color: palette.textSecondary,
  },
  skeletonList: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 14,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonTextBlock: {
    flex: 1,
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    backgroundColor: palette.surface,
  },
  footerText: {
    color: palette.primary,
    fontWeight: "700",
  },
});
