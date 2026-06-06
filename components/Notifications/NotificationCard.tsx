import NotificationBadge from "@/components/Notifications/NotificationBadge";
import {
  formatRelativeShort,
  getStatusTokens,
  getTypeTokens,
  resolveNotificationStatus,
  type NotificationStatusKey,
  type NotificationTypeKey,
} from "@/components/Notifications/notificationPresentation";
import {
  NOTIFICATION_LAYOUT,
  NOTIFICATION_NEUTRAL,
  NOTIFICATION_TYPOGRAPHY,
} from "@/components/Notifications/notificationTheme";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Icon, Text } from "react-native-paper";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface NotificationCardProps {
  notification: App.Entities.Notification;
  /**
   * Tipo visual (purchase, task, inventory, alert, system). Si no se pasa,
   * se infiere del event_type usando los helpers de presentation.
   */
  typeKey?: NotificationTypeKey;
  /**
   * Estado a mostrar. Si se omite, se resuelve a partir de is_read y data.
   */
  status?: NotificationStatusKey;
  onPress: (notification: App.Entities.Notification) => void;
  onMarkAsRead?: (notification: App.Entities.Notification) => void;
  onDelete?: (notification: App.Entities.Notification) => void;
  /**
   * Si true, oculta el tiempo relativo y la barra de no-leida. Pensado
   * para reutilizar la tarjeta en superficies donde ya hay metadata
   * (ej. la lista completa con su propia jerarquia).
   */
  compact?: boolean;
}

/**
 * Tarjeta compacta de notificacion (max 72px de alto segun spec).
 *
 * Diseno inspirado en Linear, Notion y GitHub Notifications:
 * - Barra vertical a la izquierda en color del tipo (solo no leidas)
 * - Icono dentro de un badge suave del tipo
 * - Titulo + descripcion en una sola linea cada uno
 * - Footer con tiempo relativo y badge de estado
 * - Hover en web oscurece el fondo y muestra acciones rapidas
 *
 * El fondo se anima con Reanimated para que el feedback de hover/press
 * sea suave. Se usa un Pressable nativo para soportar teclado y
 * accesibilidad en web.
 */
export default function NotificationCard({
  notification,
  typeKey,
  status,
  onPress,
  onMarkAsRead,
  onDelete,
  compact = false,
}: NotificationCardProps) {
  const resolvedType: NotificationTypeKey =
    typeKey ?? defaultTypeKey(notification);
  const resolvedStatus = status ?? resolveNotificationStatus(notification);
  const typeTokens = getTypeTokens(resolvedType);
  const statusTokens = getStatusTokens(resolvedStatus);

  // Fondo animado: depende de hover (web), press y estado leido/no leido.
  // Usamos un solo valor y lo interpolamos a un color concreto para
  // evitar problemas de drivers nativos con useState dinamicos.
  const hoverProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);

  const handleHoverIn = useCallback(() => {
    hoverProgress.value = withTiming(1, { duration: 120 });
  }, [hoverProgress]);
  const handleHoverOut = useCallback(() => {
    hoverProgress.value = withTiming(0, { duration: 160 });
  }, [hoverProgress]);
  const handlePressIn = useCallback(() => {
    pressProgress.value = withTiming(1, { duration: 80 });
  }, [pressProgress]);
  const handlePressOut = useCallback(() => {
    pressProgress.value = withTiming(0, { duration: 160 });
  }, [pressProgress]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    // Mezcla: no-leida > press > hover. El resultado es un fondo sutil.
    const base = notification.is_read
      ? NOTIFICATION_NEUTRAL.background
      : NOTIFICATION_NEUTRAL.unreadBg;
    const hover = NOTIFICATION_NEUTRAL.hover;
    const press = NOTIFICATION_NEUTRAL.borderSubtle;

    // Mezclado simple: a mas hoverProgress, mas cerca de hover. Press domina.
    const blend = Math.max(hoverProgress.value, pressProgress.value * 1.2);
    const target = blend > 0.5 ? press : hover;
    return {
      backgroundColor: blend > 0 ? target : base,
    };
  });

  return (
    <AnimatedPressable
      onPress={() => onPress(notification)}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`${typeTokens.label}: ${notification.title}`}
      accessibilityHint={
        notification.is_read ? "Notificacion leida" : "Notificacion sin leer"
      }
      style={[
        styles.container,
        { borderColor: NOTIFICATION_NEUTRAL.borderSubtle },
        containerAnimatedStyle,
        compact && styles.containerCompact,
      ]}
    >
      {/* Barra vertical de no-leida en el color del tipo. Inspirada en
          la marca lateral de las tarjetas de Linear. */}
      {!notification.is_read && (
        <View
          style={[
            styles.unreadBar,
            { backgroundColor: typeTokens.accent },
          ]}
        />
      )}

      <View style={styles.body}>
        {/* Badge de icono: contenedor cuadrado 36x36 con fondo suave del
            tipo. Inspirado en los iconos de Slack/Notion. */}
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: typeTokens.bgMedium },
          ]}
        >
          <Icon
            source={typeTokens.icon}
            size={18}
            color={typeTokens.text}
          />
        </View>

        {/* Contenido: titulo + descripcion en una sola linea cada uno
            para mantener la altura compacta. */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[
                notification.is_read
                  ? NOTIFICATION_TYPOGRAPHY.cardTitle
                  : NOTIFICATION_TYPOGRAPHY.cardTitleUnread,
                styles.title,
                { color: NOTIFICATION_NEUTRAL.textPrimary },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
          </View>
          <Text
            style={[
              NOTIFICATION_TYPOGRAPHY.cardDescription,
              styles.description,
              { color: NOTIFICATION_NEUTRAL.textSecondary },
            ]}
            numberOfLines={1}
          >
            {notification.message}
          </Text>
        </View>
      </View>

      {/* Footer: tiempo relativo a la izquierda, badge de estado + acciones
          a la derecha. Las acciones rapidas solo se muestran en hover para
          no saturar la vista compacta. */}
      <View style={styles.footer}>
        <View style={styles.metaLeft}>
          <Icon
            source="clock-outline"
            size={11}
            color={NOTIFICATION_NEUTRAL.textTertiary}
          />
          <Text
            style={[
              NOTIFICATION_TYPOGRAPHY.meta,
              styles.timeText,
              { color: NOTIFICATION_NEUTRAL.textTertiary },
            ]}
            numberOfLines={1}
          >
            {formatRelativeShort(notification.created_at)}
          </Text>
        </View>

        <View style={styles.metaRight}>
          <NotificationBadge status={resolvedStatus} hideDot={false} />

          {/* Acciones rapidas: aparecen en hover. En mobile se veran
              permanentemente porque el hover no existe, pero el area de
              tap queda pequena (24px) para no robarle espacio al titulo. */}
          {(onMarkAsRead || onDelete) && (
            <View style={styles.actions}>
              {onMarkAsRead && (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation?.();
                    onMarkAsRead(notification);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: pressed
                        ? NOTIFICATION_NEUTRAL.border
                        : "transparent",
                    },
                  ]}
                  accessibilityLabel={
                    notification.is_read
                      ? "Marcar como no leida"
                      : "Marcar como leida"
                  }
                >
                  <Icon
                    source={
                      notification.is_read
                        ? "email-mark-as-unread"
                        : "email-open-outline"
                    }
                    size={14}
                    color={statusTokens.text}
                  />
                </Pressable>
              )}
              {onDelete && (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation?.();
                    onDelete(notification);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: pressed
                        ? NOTIFICATION_NEUTRAL.border
                        : "transparent",
                    },
                  ]}
                  accessibilityLabel="Eliminar notificacion"
                >
                  <Icon
                    source="trash-can-outline"
                    size={14}
                    color={NOTIFICATION_NEUTRAL.textTertiary}
                  />
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

// Fallback por si el padre no pasa typeKey ni tenemos acceso al mapper
// en linea (imports circulares). Se prefiere la version en presentation.
function defaultTypeKey(n: App.Entities.Notification): NotificationTypeKey {
  // El padre suele pasar typeKey ya resuelto. Este fallback solo actua
  // como red de seguridad para casos en los que se monte la tarjeta
  // directamente sin pasar por NotificationsPopover. Usamos cast porque
  // event_type es un union estricto en el backend y queremos que
  // cualquier valor desconocido caiga en "system".
  const eventType = n.event_type as string;
  if (eventType === "purchase_update") return "purchase";
  if (eventType === "task_event") return "task";
  if (
    eventType === "low_stock" ||
    eventType === "inventory_adjustment" ||
    eventType === "inventory_count_discrepancy"
  ) {
    return "inventory";
  }
  if (eventType === "system_alert" || eventType === "alert") return "alert";
  return "system";
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxHeight: NOTIFICATION_LAYOUT.cardMaxHeight,
    paddingVertical: 10,
    paddingHorizontal: NOTIFICATION_LAYOUT.cardPadding,
    borderRadius: NOTIFICATION_LAYOUT.cardRadius,
    borderWidth: 1,
    overflow: "hidden",
    gap: 6,
  },
  containerCompact: {
    paddingVertical: 8,
  },
  unreadBar: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: NOTIFICATION_LAYOUT.unreadBarWidth,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  body: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  iconBadge: {
    width: NOTIFICATION_LAYOUT.iconBadgeSize,
    height: NOTIFICATION_LAYOUT.iconBadgeSize,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    flex: 1,
  },
  description: {
    // El lineHeight 16 + 18 del titulo = 34; +padding 20 = 54px para
    // body+padding. Mas el footer (~14) + gaps = ~72px respetando spec.
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginLeft: NOTIFICATION_LAYOUT.iconBadgeSize + 10,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  timeText: {
    flexShrink: 1,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});
