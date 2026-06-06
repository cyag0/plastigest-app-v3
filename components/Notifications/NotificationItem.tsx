import {
  formatNotificationDate,
  getNotificationEventConfig,
  getNotificationSeverityConfig,
} from "@/components/Notifications/notificationPresentation";
import palette from "@/constants/palette";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Chip, Divider, Icon, IconButton, Text } from "react-native-paper";

export interface NotificationItemProps {
  item: App.Entities.Notification;
  onPress: (notification: App.Entities.Notification) => void;
  handleMarkAsRead: (id: number, isRead: boolean) => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
  index: number;
  /**
   * Modo compacto: oculta las acciones inline (mark-read/delete) y reduce
   * padding. Pensado para listas dentro de popovers o drawers con poco
   * espacio vertical. El comportamiento de tap sigue siendo el mismo.
   */
  compact?: boolean;
}

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
    // En modo compacto saltamos la animacion de entrada para que el popover
    // no parpadee al abrir; la lista completa sigue animando.
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

  const severityConfig = getNotificationSeverityConfig(item.severity);
  const eventConfig = getNotificationEventConfig(item.event_type);

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        compact && styles.animatedContainerCompact,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.7}
        style={styles.touchable}
      >
        <Card
          mode="elevated"
          style={[
            styles.card,
            compact && styles.cardCompact,
            !item.is_read && styles.cardUnread,
          ]}
        >
          <Card.Content style={[styles.cardContent, compact && styles.cardContentCompact]}>
            <View
              style={[
                styles.iconBadge,
                compact && styles.iconBadgeCompact,
                { backgroundColor: eventConfig.softBg },
              ]}
            >
              <Icon
                source={eventConfig.icon}
                size={compact ? 20 : 27}
                color={eventConfig.color}
              />
            </View>

            <View style={styles.mainContent}>
              <View style={styles.cardTopRow}>
                <View style={styles.badgesContainer}>
                  {!item.is_read && (
                    <View style={styles.unreadBadge}>
                      <View style={styles.unreadDot} />
                      <Text style={styles.unreadBadgeText}>NUEVA</Text>
                    </View>
                  )}
                  <Chip
                    mode="flat"
                    compact
                    icon={eventConfig.icon}
                    textStyle={[styles.typeChipText, { color: eventConfig.color }]}
                    style={[
                      styles.typeChip,
                      compact && styles.typeChipCompact,
                      { backgroundColor: eventConfig.softBg },
                    ]}
                  >
                    {eventConfig.label}
                  </Chip>
                  {!compact && (
                    <Chip
                      mode="flat"
                      compact
                      textStyle={[
                        styles.typeChipText,
                        { color: severityConfig.color },
                      ]}
                      style={[
                        styles.typeChip,
                        { backgroundColor: severityConfig.softBg },
                      ]}
                    >
                      {severityConfig.label}
                    </Chip>
                  )}
                </View>
              </View>

              <Text
                variant={compact ? "bodyMedium" : "titleMedium"}
                style={[
                  styles.title,
                  compact && styles.titleCompact,
                  !item.is_read && styles.titleUnread,
                ]}
                numberOfLines={compact ? 1 : 2}
              >
                {item.title}
              </Text>

              {!compact && (
                <Text variant="bodyMedium" style={styles.message} numberOfLines={2}>
                  {item.message}
                </Text>
              )}

              {!compact && <Divider style={styles.divider} />}

              <View style={[styles.footerRow, compact && styles.footerRowCompact]}>
                <View style={styles.dateContainer}>
                  <Icon
                    source="clock-outline"
                    size={compact ? 11 : 13}
                    color={palette.textSecondary}
                  />
                  <Text
                    variant="bodySmall"
                    style={[styles.date, compact && styles.dateCompact]}
                  >
                    {formatNotificationDate(item.created_at, !compact)}
                  </Text>
                </View>
                {!compact && (
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon={item.is_read ? "email-outline" : "email-open-outline"}
                      size={17}
                      iconColor={item.is_read ? palette.textSecondary : palette.primary}
                      onPress={(event) => {
                        event.stopPropagation();
                        void handleMarkAsRead(item.id, item.is_read);
                      }}
                      style={styles.iconButton}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={17}
                      iconColor={palette.error}
                      onPress={(event) => {
                        event.stopPropagation();
                        void handleDelete(item.id);
                      }}
                      style={styles.iconButton}
                    />
                  </View>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    marginHorizontal: 2,
    marginVertical: 6,
  },
  animatedContainerCompact: {
    marginVertical: 2,
  },
  touchable: {
    borderRadius: 8,
  },
  card: {
    borderRadius: 8,
    backgroundColor: palette.surface,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardCompact: {
    borderRadius: 6,
  },
  cardUnread: {
    backgroundColor: palette.background,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  cardContent: {
    flexDirection: "row",
    gap: 12,
  },
  cardContentCompact: {
    gap: 10,
    paddingVertical: 10,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeCompact: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  mainContent: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  unreadBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.primary + "1A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: palette.primary,
    letterSpacing: 0.5,
  },
  typeChip: {
    height: 22,
  },
  typeChipCompact: {
    height: 20,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: "700",
    marginVertical: 0,
  },
  title: {
    color: palette.text,
    fontWeight: "700",
  },
  titleCompact: {
    fontWeight: "600",
  },
  titleUnread: {
    fontWeight: "800",
  },
  message: {
    color: palette.textSecondary,
  },
  divider: {
    marginVertical: 6,
    backgroundColor: palette.border,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerRowCompact: {
    marginTop: 2,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  date: {
    color: palette.textSecondary,
  },
  dateCompact: {
    fontSize: 11,
  },
  actionButtons: {
    flexDirection: "row",
  },
  iconButton: {
    margin: 0,
    width: 30,
    height: 30,
  },
});
