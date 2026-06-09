import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import NotificationsPopover from "@/components/Notifications/NotificationsPopover";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  IconButton,
  Menu,
  Modal,
  Portal,
  Text,
} from "react-native-paper";

const NOTIFICATIONS_ROUTE = "/(tabs)/notifications";
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
}

/**
 * Campana de notificaciones. En web con ancho >= 900px abre un popover
 * anclado a la campana con las 5 notificaciones mas recientes; al tocar
 * una fila del popover se abre un modal de detalle con la misma UI que
 * usa la pagina completa en desktop. En mobile (o web < 900px) navega a
 * la pantalla completa de notificaciones, donde la propia pagina ya
 * gestiona el modal/desktop o la navegacion/mobile.
 *
 * Lee el contador de no leidas directamente de useAuth() para que el badge
 * se mantenga sincronizado con el backend en cuanto AuthContext lo refresca.
 */
export default function NotificationBell({
  iconColor = palette.textSecondary,
  badgeSize = "small",
}: NotificationBellProps) {
  const router = useRouter();
  const alerts = useAlerts();
  const { unreadNotificationsCount, loadUnreadNotificationsCount } = useAuth();
  const { width, height } = useWindowDimensions();

  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<App.Entities.Notification | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const navigateToList = useCallback(() => {
    setMenuVisible(false);
    router.push(NOTIFICATIONS_ROUTE as any);
  }, [router]);

  const handleItemPress = useCallback(
    async (notification: App.Entities.Notification) => {
      // Cerramos el popover y abrimos el modal en lugar de navegar. Asi el
      // usuario ve el detalle al instante, sin perder el contexto del bell.
      setMenuVisible(false);
      setSelectedNotification(notification);
      setDetailVisible(true);

      // Marcamos como leida en el backend para que el badge baje; usamos el
      // mismo patron silencioso que la pagina completa (sin toast).
      try {
        await services.notifications.markAsRead(notification.id);
        loadUnreadNotificationsCount();
      } catch (error) {
        console.warn("No se pudo marcar como leida:", error);
      }
    },
    [loadUnreadNotificationsCount],
  );

  const closeDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedNotification(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedNotification) return;

    const confirmed = await alerts.confirm("Eliminar esta notificacion?", {
      title: "Confirmar eliminacion",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;

    try {
      await services.notifications.destroy(selectedNotification.id);
      loadUnreadNotificationsCount();
      closeDetail();
    } catch {
      alerts.error("Error al eliminar la notificacion");
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
          color={iconColor}
        />
      </TouchableOpacity>
      {unreadNotificationsCount > 0 && (
        <View
          style={[
            styles.badge,
            badgeSize === "medium" ? styles.badgeMedium : styles.badgeSmall,
          ]}
        >
          <Text style={styles.badgeText}>
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
        />
      </Menu>

      {/* Modal de detalle — reutiliza el componente de la pagina completa
          para que ambas superficies (popover y lista) muestren el mismo
          contenido. Se monta en un Portal de Paper para que flote sobre
          toda la app. */}
      <Portal>
        <Modal
          visible={detailVisible}
          onDismiss={closeDetail}
          contentContainerStyle={styles.detailModal}
        >
          <View style={styles.detailModalHeader}>
            <View>
              <Text variant="titleMedium" style={styles.detailModalTitle}>
                Detalle de notificacion
              </Text>
              <Text variant="bodySmall" style={styles.detailModalSubtitle}>
                Vista rapida desde el popover
              </Text>
            </View>
            <IconButton
              icon="close"
              size={20}
              iconColor={palette.textSecondary}
              onPress={closeDetail}
              style={styles.closeButton}
            />
          </View>
          {selectedNotification && (
            <View
              style={[
                styles.detailModalBody,
                { height: Math.min(height - 200, 720) },
              ]}
            >
              <NotificationDetailContent
                notification={selectedNotification}
                compact
                onDelete={handleDelete}
              />
            </View>
          )}
        </Modal>
      </Portal>
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
    position: "absolute",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.error,
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
    color: palette.textInverse,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  menuContent: {
    marginTop: 48,
    backgroundColor: "transparent",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  detailModal: {
    backgroundColor: palette.background,
    borderRadius: 12,
    overflow: "hidden",
    // El Modal de Paper renderiza su contenido en un overlay; necesitamos
    // centrarnos nosotros mismos y capar el ancho para que en pantallas
    // ultra anchas no se estire de lado a lado.
    alignSelf: "center",
    width: "100%",
    maxWidth: 640,
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  detailModalTitle: {
    color: palette.text,
    fontWeight: "700",
  },
  detailModalSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    margin: 0,
  },
  detailModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
