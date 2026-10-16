import NotificationRow from "@/components/Notifications/NotificationRow";
import { groupNotifications } from "@/components/Notifications/notificationPresentation";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { IconButton } from "react-native-paper";

const POPOVER_LIMIT = 8;

export interface NotificationsPopoverProps {
  /** El padre cierra el menú y abre el registro o el detalle. */
  onItemPress: (notification: App.Entities.Notification) => void;
  /** "Ver todas": el padre cierra el menú y abre la bandeja. */
  onViewAllPress: () => void;
  /** Preferencias de notificaciones; sin esto no se muestra el engrane. */
  onSettingsPress?: () => void;
}

/**
 * Contenido del popover de la campana (escritorio): las últimas
 * notificaciones agrupadas por fecha, con el mismo renglón que la bandeja.
 */
export default function NotificationsPopover({
  onItemPress,
  onViewAllPress,
  onSettingsPress,
}: NotificationsPopoverProps) {
  const { loadUnreadNotificationsCount, unreadNotificationsCount } = useAuth();
  const { colors } = useTheme();

  const [notifications, setNotifications] = useState<App.Entities.Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Se carga una vez, al abrir el popover. Solo las más recientes: antes se
  // pedía la bandeja completa (all) para mostrar 8.
  useEffect(() => {
    let active = true;
    services.notifications
      .index({ per_page: POPOVER_LIMIT })
      .then((response) => {
        if (!active) return;
        const data: App.Entities.Notification[] = Array.isArray(response.data)
          ? response.data
          : (response.data?.data ?? []);
        setNotifications(data.slice(0, POPOVER_LIMIT));
      })
      .catch((error) => {
        console.warn("Error al cargar notificaciones en popover:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Total real de no leídas (el mismo de la campana), no solo las 8 visibles.
  const unreadCount = Math.max(
    unreadNotificationsCount,
    notifications.filter((n) => !n.is_read).length,
  );

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await services.notifications.markAllAsRead();
      setNotifications((current) =>
        current.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
      );
      await loadUnreadNotificationsCount();
    } catch (error) {
      console.warn("Error al marcar todas como leídas:", error);
    }
  };

  const handleItemPress = (notification: App.Entities.Notification) => {
    // Se marca al instante; si el padre falla, el contador del backend manda.
    setNotifications((current) =>
      current.map((n) =>
        n.id === notification.id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      ),
    );
    onItemPress(notification);
  };

  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const styles = useThemedStyles((c) => ({
    container: {
      width: 400,
      maxHeight: 560,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      ...tokens.shadow.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingLeft: 16,
      paddingRight: 6,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 15, fontWeight: "600", color: c.text },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    markAll: { fontSize: 13, fontWeight: "600", color: c.primary, paddingHorizontal: 6 },
    scroll: { flexGrow: 0, flexShrink: 1 },
    groupTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: c.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 2,
    },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 46 },
    state: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 32,
      paddingHorizontal: 16,
    },
    stateText: { fontSize: 14, color: c.textSecondary },
    footer: {
      alignItems: "center",
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    footerText: { fontSize: 14, fontWeight: "600", color: c.primary },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificaciones</Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAllAsRead} hitSlop={8} accessibilityRole="button">
              <Text style={styles.markAll}>Marcar todas como leídas</Text>
            </Pressable>
          )}
          {onSettingsPress && (
            <IconButton
              icon="cog-outline"
              size={18}
              iconColor={colors.textSecondary}
              onPress={onSettingsPress}
              accessibilityLabel="Preferencias de notificaciones"
            />
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="bell-check-outline" size={20} color={colors.textMuted} />
          <Text style={styles.stateText}>No tienes notificaciones.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.key}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.data.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <NotificationRow dense notification={item} onPress={handleItemPress} />
                </React.Fragment>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={onViewAllPress}
        style={({ pressed }) => [styles.footer, pressed && { backgroundColor: colors.surfaceMuted }]}
        accessibilityRole="button"
      >
        <Text style={styles.footerText}>Ver todas</Text>
      </Pressable>
    </View>
  );
}
