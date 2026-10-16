import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import NotificationDetailModal from "@/components/Notifications/NotificationDetailModal";
import {
  getNotificationLink,
  NOTIFICATIONS_INBOX_ROUTE,
  notificationPreferencesRoute,
  type NotificationLink,
} from "@/components/Notifications/notificationLinks";
import NotificationsPopover from "@/components/Notifications/NotificationsPopover";
import { markNotificationReadQuietly } from "@/components/Notifications/notificationRequests";
import {
  isLinkedRecordNote,
  type LinkedRecordNote,
  useLinkedRecordOpener,
} from "@/components/Notifications/useLinkedRecordOpener";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Menu, Text } from "react-native-paper";

const DESKTOP_BREAKPOINT = 900;

export interface NotificationBellProps {
  /**
   * Color del icono y de la campana. Por defecto el gris secundario de la
   * paleta, igual que el resto de acciones del AppBar y el sidebar.
   */
  iconColor?: string;
  /**
   * Tamano del badge. "small" para AppBar (18px), "medium" para sidebar
   * (20px, coincide con el badge actual del sidebar).
   */
  badgeSize?: "small" | "medium";
  /**
   * Oculta el contador sobre la campana (p. ej. en el pie del sidebar, que ya
   * muestra el número a un lado).
   */
  showBadge?: boolean;
  /**
   * false: la campana siempre lleva a la bandeja, sin popover. Lo usa el pie
   * del sidebar: ahí el popover se abría pegado al borde inferior y se salía
   * de la pantalla.
   */
  popover?: boolean;
}

/**
 * Campana de notificaciones. En web con ancho >= 900px abre un popover
 * anclado a la campana con las notificaciones mas recientes; al tocar una
 * fila se abre la pantalla del registro (tarea, compra, transferencia…) y,
 * si el aviso no trae a dónde ir, un modal de detalle con la misma UI que
 * usa la pagina completa en desktop. En mobile (o web < 900px) navega a
 * la pantalla completa de notificaciones, donde la propia pagina ya
 * gestiona el modal/desktop o la navegacion/mobile.
 *
 * Lee el contador de no leidas directamente de useAuth() para que el badge
 * se mantenga sincronizado con el backend en cuanto AuthContext lo refresca.
 */
export default function NotificationBell({
  iconColor,
  badgeSize = "small",
  showBadge = true,
  popover = true,
}: NotificationBellProps) {
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { unreadNotificationsCount, loadUnreadNotificationsCount, hasPermission, location } =
    useAuth();
  const allLocations = useAllLocationsAccess();
  const { width } = useWindowDimensions();

  const isDesktop =
    popover && Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<App.Entities.Notification | null>(null);
  // Por qué no se abrió el registro del aviso (lo explica el modal).
  const [selectedLinkNote, setSelectedLinkNote] = useState<LinkedRecordNote | null>(null);
  const { open: openLinkedRecord } = useLinkedRecordOpener();

  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const navigateToList = useCallback(() => {
    setMenuVisible(false);
    router.push(NOTIFICATIONS_INBOX_ROUTE as any);
  }, [router]);

  const openSettings = useCallback(() => {
    setMenuVisible(false);
    router.push(notificationPreferencesRoute(allLocations, !!location) as any);
  }, [router, allLocations, location]);

  const handleItemPress = useCallback(
    async (notification: App.Entities.Notification) => {
      setMenuVisible(false);

      // Marcamos como leida en el backend para que el badge baje; usamos el
      // mismo patron silencioso que la pagina completa (sin toast).
      if (!notification.is_read) {
        markNotificationReadQuietly(notification.id)
          .catch((error) => console.warn("No se pudo marcar como leída:", error))
          .finally(() => {
            loadUnreadNotificationsCount();
          });
      }

      // Igual que en la bandeja y en el push: se abre el registro
      // relacionado (si existe, se puede ver y es de esta sucursal); si el
      // aviso no trae su id o el registro no se pudo abrir, el detalle en un
      // modal con el motivo.
      const target = getNotificationLink(notification.event_type, notification.data);
      const outcome = target ? await openLinkedRecord(target) : null;
      if (!target || isLinkedRecordNote(outcome)) {
        setSelectedNotification({ ...notification, is_read: true });
        setSelectedLinkNote(isLinkedRecordNote(outcome) ? outcome : null);
      }
    },
    [loadUnreadNotificationsCount, openLinkedRecord],
  );

  const closeDetail = useCallback(() => {
    setSelectedNotification(null);
    setSelectedLinkNote(null);
  }, []);

  // Botón del modal: mismas revisiones; al navegar se cierra el modal.
  const openRelated = useCallback(
    (link: NotificationLink) =>
      openLinkedRecord(link, {
        navigate: (route) => {
          closeDetail();
          router.push(route as any);
        },
      }),
    [closeDetail, openLinkedRecord, router],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedNotification) return;

    const confirmed = await alerts.confirm("¿Eliminar esta notificación?", {
      title: "Eliminar notificación",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await services.notifications.destroy(selectedNotification.id);
      loadUnreadNotificationsCount();
      closeDetail();
    } catch {
      alerts.error("Error al eliminar la notificación");
    }
  }, [alerts, closeDetail, loadUnreadNotificationsCount, selectedNotification]);

  const bell = (
    <View style={styles.bellContainer}>
      <TouchableOpacity
        onPress={isDesktop ? () => setMenuVisible(true) : navigateToList}
        accessibilityLabel="Notificaciones"
        style={styles.bellButton}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="bell-outline"
          size={20}
          color={iconColor ?? colors.textSecondary}
        />
      </TouchableOpacity>
      {showBadge && unreadNotificationsCount > 0 && (
        // pointerEvents none (en badge): queda encima de la campana y en web
        // se tragaba el clic (no abría el popover al tocar cerca del número).
        <View
          style={[
            styles.badge,
            badgeSize === "medium" ? styles.badgeMedium : styles.badgeSmall,
            { backgroundColor: colors.error },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.textInverse }]}>
            {unreadNotificationsCount > 99
              ? "99+"
              : unreadNotificationsCount}
          </Text>
        </View>
      )}
    </View>
  );

  if (!isDesktop) {
    return bell;
  }

  return (
    <>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={bell}
        contentStyle={styles.menuContent}
      >
        <NotificationsPopover
          onItemPress={handleItemPress}
          onViewAllPress={navigateToList}
          onSettingsPress={
            hasPermission("notifications_list") ? openSettings : undefined
          }
        />
      </Menu>

      {/* Detalle de los avisos sin registro relacionado o cuyo registro no se pudo abrir. */}
      <NotificationDetailModal
        notification={selectedNotification}
        onDismiss={closeDetail}
        onDelete={handleDelete}
        onOpenLink={openRelated}
        linkNote={selectedLinkNote}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    position: "relative",
  },
  bellButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  badge: {
    pointerEvents: "none",
    position: "absolute",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSmall: {
    top: 2,
    right: 2,
  },
  badgeMedium: {
    top: 4,
    right: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  // El popover trae su propia superficie, borde y sombra.
  menuContent: {
    marginTop: 48,
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
  },
});
