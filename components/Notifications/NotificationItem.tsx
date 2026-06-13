import AppChip, { type ChipVariant } from "@/components/App/Chip";
import {
  formatNotificationDate,
  getNotificationEventConfig,
  getNotificationSeverityConfig,
} from "@/components/Notifications/notificationPresentation";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

/** Mapea la severidad de la notificacion a una variante de AppChip. */
const SEVERITY_VARIANT: Record<string, ChipVariant> = {
  success: "success",
  error: "error",
  alert: "error",
  warning: "warning",
  info: "info",
};

export interface NotificationItemProps {
  item: App.Entities.Notification;
  onPress: (notification: App.Entities.Notification) => void;
  handleMarkAsRead: (id: number, isRead: boolean) => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
  index: number;
  /**
   * Modo compacto: reduce el padding vertical. Pensado para listas con poco
   * espacio. El comportamiento de tap sigue siendo el mismo.
   */
  compact?: boolean;
}

/**
 * Fila de notificacion para la lista completa. Comparte el lenguaje visual
 * de las tareas (tarjeta blanca, icono de tipo, titulo + chevron, meta y
 * chips de estado) para que ambas bandejas se sientan iguales. El popover
 * usa otro componente (NotificationCard) y no se ve afectado.
 */
export default function NotificationItem({
  item,
  onPress,
  handleMarkAsRead,
  handleDelete,
  index,
  compact = false,
}: NotificationItemProps) {
  const scaleAnim = useRef(new Animated.Value(0.97)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (compact) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        delay: Math.min(index * 35, 180),
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
        delay: Math.min(index * 35, 180),
      }),
    ]).start();
  }, [compact, index, opacityAnim, scaleAnim]);

  const eventConfig = getNotificationEventConfig(item.event_type);
  const severityConfig = getNotificationSeverityConfig(item.severity);

  // "info" es ruido en la mayoria de notificaciones; solo destacamos
  // severidades relevantes (aviso, alerta, error, exito) como chip.
  const showSeverity = item.severity !== "info";
  const showChips = !item.is_read || showSeverity;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        compact && styles.wrapperCompact,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        style={[styles.card, !item.is_read && styles.cardUnread]}
      >
        <View style={[styles.row, compact && styles.rowCompact]}>
          <View style={[styles.typeIcon, { backgroundColor: eventConfig.softBg }]}>
            <MaterialCommunityIcons
              name={eventConfig.icon as any}
              size={20}
              color={eventConfig.color}
            />
          </View>

          <View style={styles.body}>
            <View style={styles.headerLine}>
              <Text
                style={[styles.title, !item.is_read && styles.titleUnread]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={palette.textMuted}
              />
            </View>

            <Text style={styles.meta} numberOfLines={1}>
              {eventConfig.label} · {formatNotificationDate(item.created_at, true)}
            </Text>

            <Text style={styles.message} numberOfLines={2}>
              {item.message}
            </Text>

            {showChips && (
              <View style={styles.chipsRow}>
                {!item.is_read && (
                  <AppChip variant="primary" size="sm" icon="circle-medium">
                    Nueva
                  </AppChip>
                )}
                {showSeverity && (
                  <AppChip
                    variant={SEVERITY_VARIANT[item.severity] ?? "default"}
                    size="sm"
                    icon={severityConfig.icon as any}
                  >
                    {severityConfig.label}
                  </AppChip>
                )}
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  void handleMarkAsRead(item.id, item.is_read);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.actionBtn}
                accessibilityLabel={
                  item.is_read ? "Marcar como no leida" : "Marcar como leida"
                }
              >
                <MaterialCommunityIcons
                  name={item.is_read ? "email-outline" : "email-open-outline"}
                  size={16}
                  color={item.is_read ? palette.textSecondary : palette.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={(event) => {
                  event.stopPropagation();
                  void handleDelete(item.id);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.actionBtn}
                accessibilityLabel="Eliminar notificacion"
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={16}
                  color={palette.error}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[3],
  },
  wrapperCompact: {
    marginHorizontal: 0,
    marginBottom: tokens.spacing[2],
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    ...tokens.shadow.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  rowCompact: {
    paddingVertical: tokens.spacing[3],
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  headerLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing[2],
  },
  title: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    flex: 1,
  },
  titleUnread: {
    fontWeight: "700",
  },
  meta: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
  },
  message: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing[1],
    marginTop: tokens.spacing[1],
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: tokens.radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
