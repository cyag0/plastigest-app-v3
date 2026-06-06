import NotificationCard from "@/components/Notifications/NotificationCard";
import NotificationEmptyState from "@/components/Notifications/NotificationEmptyState";
import NotificationGroupHeader from "@/components/Notifications/NotificationGroupHeader";
import {
  eventTypeToTypeKey,
  groupNotification,
  NOTIFICATION_GROUP_LABEL,
  NOTIFICATION_GROUP_ORDER,
  type NotificationGroupKey,
} from "@/components/Notifications/notificationPresentation";
import {
  NOTIFICATION_LAYOUT,
  NOTIFICATION_NEUTRAL,
  NOTIFICATION_SHADOW,
  NOTIFICATION_TYPOGRAPHY,
} from "@/components/Notifications/notificationTheme";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import services from "@/utils/services";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Divider, Icon, Text } from "react-native-paper";

const POPOVER_LIMIT = 8;

export interface NotificationsPopoverProps {
  /**
   * Se dispara cuando el usuario elige una notificacion. El padre debe
   * encargarse de cerrar el Menu y abrir el detalle. Esto desacopla el
   * popover del router/menu y lo hace facil de testear.
   */
  onItemPress: (notification: App.Entities.Notification) => void;
  /**
   * Se dispara cuando el usuario hace click en "Ver todas" del footer.
   * El padre cierra el menu y navega a la lista completa.
   */
  onViewAllPress: () => void;
  /**
   * Accion opcional para abrir la pantalla de configuracion de
   * notificaciones. Si no se pasa, el boton de settings no se renderiza.
   */
  onSettingsPress?: () => void;
}

/**
 * Contenido del popover de notificaciones.
 *
 * Diseno:
 * - 400px de ancho, fondo blanco, radio 16px, sombra moderna multi-capa.
 * - Header sticky con campana, titulo, contador de no leidas y acciones
 *   (marcar todas, configuracion).
 * - Lista agrupada por fecha (Hoy, Ayer, Esta semana, Anterior) con
 *   encabezados sutiles al estilo GitHub.
 * - Tarjetas compactas (max 72px) con barra lateral de color para
 *   no leidas, badge de tipo, tiempo relativo y badge de estado.
 * - Footer sticky con "Ver todas las notificaciones" centrado.
 *
 * La carga es lazy al primer mount. El componente no expone delete ni
 * navegacion directa: el padre decide en funcion de la superficie
 * (popover, lista completa, etc.).
 */
export default function NotificationsPopover({
  onItemPress,
  onViewAllPress,
  onSettingsPress,
}: NotificationsPopoverProps) {
  const { loadUnreadNotificationsCount } = useAuth();

  const [notifications, setNotifications] = useState<App.Entities.Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await services.notifications.index({ all: true });
      const data: App.Entities.Notification[] = Array.isArray(response.data)
        ? response.data
        : (response.data?.data ?? []);
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
    // Optimistic update para que el indicador "Nueva" desaparezca al
    // instante; si el padre falla, el contador del backend manda.
    setNotifications((current) =>
      current.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      ),
    );
    onItemPress(notification);
  };

  const handleItemMarkAsRead = async (notification: App.Entities.Notification) => {
    try {
      if (notification.is_read) {
        await services.notifications.markAsUnread(notification.id);
      } else {
        await services.notifications.markAsRead(notification.id);
      }
      setNotifications((current) =>
        current.map((n) =>
          n.id === notification.id
            ? {
                ...n,
                is_read: !n.is_read,
                read_at: !n.is_read ? new Date().toISOString() : null,
              }
            : n,
        ),
      );
      loadUnreadNotificationsCount();
    } catch (error) {
      console.warn("Error al actualizar la notificacion:", error);
    }
  };

  // Agrupamos por fecha una sola vez por render. El helper es estable
  // frente al orden del array, asi que memoizar evita recalcular en cada
  // press/hover del padre.
  const grouped = useMemo(() => {
    const buckets = new Map<NotificationGroupKey, App.Entities.Notification[]>();
    for (const item of notifications) {
      const { key } = groupNotification(item.created_at);
      const list = buckets.get(key) ?? [];
      list.push(item);
      buckets.set(key, list);
    }
    return NOTIFICATION_GROUP_ORDER
      .map((key) => ({
        key,
        label: NOTIFICATION_GROUP_LABEL[key],
        items: buckets.get(key) ?? [],
      }))
      .filter((group) => group.items.length > 0);
  }, [notifications]);

  return (
    <View
      style={[
        styles.container,
        NOTIFICATION_SHADOW,
      ]}
    >
      {/* ───── Header sticky ─────────────────────────────────────────────
          Campana + titulo a la izquierda, contador y acciones a la derecha.
          El fondo blanco + border-bottom sutil crean la sensacion de
          "fijo" cuando la lista hace scroll debajo. */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Icon
              source="bell-outline"
              size={16}
              color={NOTIFICATION_NEUTRAL.primaryText}
            />
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.headerTitle}>Notificaciones</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>
                {unreadCount} {unreadCount === 1 ? "sin leer" : "sin leer"}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllAsRead}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.headerActionPressed,
              ]}
              accessibilityLabel="Marcar todas como leidas"
            >
              <Icon
                source="check-all"
                size={14}
                color={NOTIFICATION_NEUTRAL.primaryText}
              />
              <Text style={styles.headerActionText}>Marcar todas</Text>
            </Pressable>
          )}
          {onSettingsPress && (
            <Pressable
              onPress={onSettingsPress}
              hitSlop={8}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.headerActionPressed,
              ]}
              accessibilityLabel="Configuracion de notificaciones"
            >
              <Icon
                source="cog-outline"
                size={16}
                color={NOTIFICATION_NEUTRAL.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* ───── Body ──────────────────────────────────────────────────────
          ScrollView con padding consistente. Dentro se renderizan los
          grupos de fecha con su encabezado y las tarjetas. */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={NOTIFICATION_NEUTRAL.primaryText} />
            <Text style={styles.loadingText}>Cargando notificaciones...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <NotificationEmptyState />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {grouped.map((group) => (
              <View key={group.key} style={styles.group}>
                <NotificationGroupHeader
                  label={group.label}
                  count={group.items.length}
                />
                <View style={styles.groupItems}>
                  {group.items.map((item) => (
                    <NotificationCard
                      key={item.id}
                      notification={item}
                      typeKey={eventTypeToTypeKey(item.event_type)}
                      onPress={handleItemPress}
                      onMarkAsRead={handleItemMarkAsRead}
                      compact
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ───── Footer sticky ─────────────────────────────────────────────
          Solo se muestra cuando hay contenido. Inspirado en el "View all"
          de los popovers de GitHub y Linear. */}
      {!loading && notifications.length > 0 && (
        <>
          <Divider style={styles.divider} />
          <Pressable
            style={({ pressed }) => [
              styles.footer,
              pressed && styles.footerPressed,
            ]}
            onPress={onViewAllPress}
            accessibilityLabel="Ver todas las notificaciones"
          >
            <Text style={styles.footerText}>Ver todas las notificaciones</Text>
            <Icon
              source="arrow-right"
              size={14}
              color={NOTIFICATION_NEUTRAL.primaryText}
            />
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: NOTIFICATION_LAYOUT.containerWidth,
    maxHeight: NOTIFICATION_LAYOUT.containerMaxHeight,
    backgroundColor: NOTIFICATION_NEUTRAL.background,
    borderRadius: NOTIFICATION_LAYOUT.containerRadius,
    overflow: "hidden",
    // Borde sutil para definir el limite en pantallas muy claras.
    borderWidth: 1,
    borderColor: NOTIFICATION_NEUTRAL.borderSubtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: NOTIFICATION_NEUTRAL.background,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: NOTIFICATION_NEUTRAL.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    backgroundColor: palette.error,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
  },
  headerTitle: {
    ...NOTIFICATION_TYPOGRAPHY.headerTitle,
    color: NOTIFICATION_NEUTRAL.textPrimary,
  },
  headerSubtitle: {
    ...NOTIFICATION_TYPOGRAPHY.headerSubtitle,
    color: NOTIFICATION_NEUTRAL.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  headerActionPressed: {
    backgroundColor: NOTIFICATION_NEUTRAL.hover,
  },
  headerActionText: {
    ...NOTIFICATION_TYPOGRAPHY.meta,
    color: NOTIFICATION_NEUTRAL.primaryText,
    fontWeight: "600",
  },
  iconButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    backgroundColor: NOTIFICATION_NEUTRAL.borderSubtle,
  },
  body: {
    flex: 1,
    minHeight: 80,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    ...NOTIFICATION_TYPOGRAPHY.cardDescription,
    color: NOTIFICATION_NEUTRAL.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: NOTIFICATION_LAYOUT.containerPadding,
    paddingTop: 4,
    paddingBottom: 8,
  },
  group: {
    marginBottom: 4,
  },
  groupItems: {
    gap: NOTIFICATION_LAYOUT.cardGap,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    backgroundColor: NOTIFICATION_NEUTRAL.background,
  },
  footerPressed: {
    backgroundColor: NOTIFICATION_NEUTRAL.hover,
  },
  footerText: {
    ...NOTIFICATION_TYPOGRAPHY.footer,
    color: NOTIFICATION_NEUTRAL.primaryText,
  },
});
