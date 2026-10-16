import { ListRow } from "@/components/App/ListGroup";
import RowMenu, { type RowMenuAction } from "@/components/App/RowMenu";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import {
  formatRelativeShort,
  getNotificationCategoryLabel,
  getNotificationIcon,
  notificationToneColor,
} from "./notificationPresentation";

/**
 * Renglón de notificación, el mismo en la bandeja y en la campana. Las sin
 * leer van en negritas y con un punto sobre el ícono; el ícono solo toma
 * color en alertas, avisos y éxitos.
 */
export default function NotificationRow({
  notification,
  onPress,
  onToggleRead,
  onDelete,
  dense = false,
}: {
  notification: App.Entities.Notification;
  onPress: (notification: App.Entities.Notification) => void;
  /** Con estas acciones aparece el menú ⋮ del renglón. */
  onToggleRead?: (notification: App.Entities.Notification) => void;
  onDelete?: (notification: App.Entities.Notification) => void;
  /** Versión corta para la campana: el título también en una línea. */
  dense?: boolean;
}) {
  const { colors } = useTheme();
  const unread = !notification.is_read;

  const actions: RowMenuAction[] = [];
  if (onToggleRead) {
    actions.push(
      unread
        ? {
            label: "Marcar como leída",
            icon: "email-open-outline",
            onPress: () => onToggleRead(notification),
          }
        : {
            label: "Marcar como no leída",
            icon: "email-mark-as-unread",
            onPress: () => onToggleRead(notification),
          },
    );
  }
  if (onDelete) {
    actions.push({
      label: "Eliminar",
      icon: "trash-can-outline",
      destructive: true,
      onPress: () => onDelete(notification),
    });
  }

  return (
    <ListRow
      alignTop
      icon={getNotificationIcon(notification.event_type, notification.data)}
      iconColor={notificationToneColor(colors, notification.severity)}
      dot={unread}
      strong={unread}
      title={notification.title}
      titleLines={dense ? 1 : 2}
      subtitle={notification.message}
      subtitleLines={1}
      meta={`${getNotificationCategoryLabel(notification.event_type)} · ${formatRelativeShort(
        notification.created_at,
      )}`}
      trailing={actions.length > 0 ? <RowMenu actions={actions} /> : undefined}
      chevron={!dense}
      onPress={() => onPress(notification)}
      accessibilityLabel={`${unread ? "Sin leer: " : ""}${notification.title}`}
    />
  );
}
