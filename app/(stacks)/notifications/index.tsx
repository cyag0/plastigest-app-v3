"use client";

import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import NotificationItem from "@/components/Notifications/NotificationItem";
import {
  formatNotificationDate,
  getNotificationEventConfig,
  getNotificationSeverityConfig,
  notificationEventOptions,
} from "@/components/Notifications/notificationPresentation";
import SkeletonLoader from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Card,
  Chip,
  Divider,
  FAB,
  Icon,
  IconButton,
  Modal,
  Portal,
  Searchbar,
  SegmentedButtons,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type ReadFilter = "all" | "unread" | "read";
type EventFilter = "all" | App.Entities.NotificationEventType;

function NotificationSkeleton() {
  return (
    <Card style={styles.skeletonCard} mode="elevated">
      <Card.Content style={styles.cardContent}>
        <SkeletonLoader width={52} height={52} borderRadius={8} />
        <View style={styles.skeletonTextBlock}>
          <SkeletonLoader width="55%" height={13} style={styles.skeletonLine} />
          <SkeletonLoader width="92%" height={18} style={styles.skeletonLine} />
          <SkeletonLoader width="76%" height={13} style={styles.skeletonLine} />
          <SkeletonLoader width="38%" height={12} />
        </View>
      </Card.Content>
    </Card>
  );
}


function matchesSearch(notification: App.Entities.Notification, rawSearch: string) {
  const search = rawSearch.trim().toLowerCase();

  if (!search) {
    return true;
  }

  const eventLabel = getNotificationEventConfig(notification.event_type).label;
  const dataText = notification.data ? JSON.stringify(notification.data) : "";

  return [
    notification.title,
    notification.message,
    notification.event_type,
    notification.severity,
    eventLabel,
    dataText,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { loadUnreadNotificationsCount } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;

  const [notifications, setNotifications] = useState<App.Entities.Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<App.Entities.Notification | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const params: Record<string, string | boolean> = { all: true };

      if (readFilter === "unread") params.read = "false";
      if (readFilter === "read") params.read = "true";
      if (eventFilter !== "all") params.event_type = eventFilter;

      const response = await services.notifications.index(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setNotifications(data);
    } catch (error: any) {
      alerts.error(error.response?.data?.message || "Error al cargar las notificaciones");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alerts, eventFilter, readFilter]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const visibleNotifications = useMemo(
    () => notifications.filter((notification) => matchesSearch(notification, search)),
    [notifications, search],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const setNotificationReadState = useCallback(
    (id: number, isRead: boolean) => {
      const readAt = isRead ? new Date().toISOString() : null;
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: isRead, read_at: readAt }
            : notification,
        ),
      );
      setSelectedNotification((current) =>
        current?.id === id ? { ...current, is_read: isRead, read_at: readAt } : current,
      );
    },
    [],
  );

  const markAsReadSilently = useCallback(
    async (notification: App.Entities.Notification) => {
      if (notification.is_read) {
        return;
      }

      try {
        await services.notifications.markAsRead(notification.id);
        setNotificationReadState(notification.id, true);
        loadUnreadNotificationsCount();
        void loadNotifications();
      } catch {
        alerts.error("Error al marcar la notificacion como leida");
      }
    },
    [alerts, loadNotifications, loadUnreadNotificationsCount, setNotificationReadState],
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadNotifications();
  };

  const handleOpenNotification = (notification: App.Entities.Notification) => {
    if (isDesktop) {
      setSelectedNotification(notification);
      setDetailVisible(true);
      void markAsReadSilently(notification);
      return;
    }

    router.push(`/(stacks)/notifications/${notification.id}` as any);
  };

  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    try {
      if (isRead) {
        await services.notifications.markAsUnread(id);
        alerts.success("Marcada como no leida");
        setNotificationReadState(id, false);
      } else {
        await services.notifications.markAsRead(id);
        alerts.success("Marcada como leida");
        setNotificationReadState(id, true);
      }

      loadUnreadNotificationsCount();
      void loadNotifications();
    } catch {
      alerts.error("Error al actualizar la notificacion");
    }
  };

  const handleMarkAllAsRead = async () => {
    const confirmed = await alerts.confirm("Marcar todas las notificaciones como leidas?", {
      title: "Confirmar",
      okText: "Si",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    try {
      await services.notifications.markAllAsRead();
      alerts.success("Todas las notificaciones marcadas como leidas");
      loadUnreadNotificationsCount();
      void loadNotifications();
    } catch {
      alerts.error("Error al marcar todas como leidas");
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await alerts.confirm("Eliminar esta notificacion?", {
      title: "Confirmar eliminacion",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (!confirmed) {
      return;
    }

    try {
      await services.notifications.destroy(id);
      alerts.success("Notificacion eliminada");
      setNotifications((current) => current.filter((notification) => notification.id !== id));
      if (selectedNotification?.id === id) {
        setDetailVisible(false);
        setSelectedNotification(null);
      }
      loadUnreadNotificationsCount();
      void loadNotifications();
    } catch {
      alerts.error("Error al eliminar la notificacion");
    }
  };

  const emptyMessage = useMemo(() => {
    if (search.trim()) {
      return "No hay resultados para esa busqueda.";
    }

    if (eventFilter !== "all") {
      const label = getNotificationEventConfig(eventFilter).label.toLowerCase();
      return `No hay notificaciones de ${label} con estos filtros.`;
    }

    if (readFilter === "unread") {
      return "No tienes notificaciones sin leer.";
    }

    if (readFilter === "read") {
      return "No tienes notificaciones leidas.";
    }

    return "Las notificaciones apareceran aqui cuando el sistema genere eventos.";
  }, [eventFilter, readFilter, search]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.container}>
        <View style={styles.headerPanel}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerIcon}>
              <Icon source="bell-badge-outline" size={28} color={palette.primary} />
            </View>
            <View style={styles.headerTextBlock}>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                Notificaciones
              </Text>
              <Text variant="bodyMedium" style={styles.headerSubtitle}>
                {visibleNotifications.length} visibles / {notifications.length} cargadas
              </Text>
            </View>
            <View style={styles.unreadSummary}>
              <Text style={styles.unreadSummaryNumber}>{unreadCount}</Text>
              <Text style={styles.unreadSummaryLabel}>sin leer</Text>
            </View>
          </View>

          <Searchbar
            placeholder="Buscar por titulo, mensaje o tipo"
            onChangeText={setSearch}
            value={search}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            mode="bar"
            icon="magnify"
            clearIcon="close-circle-outline"
          />

          <SegmentedButtons
            value={readFilter}
            onValueChange={(value) => setReadFilter(value as ReadFilter)}
            buttons={[
              { value: "all", label: "Todas", icon: "bell-outline" },
              { value: "unread", label: "No leidas", icon: "email-outline" },
              { value: "read", label: "Leidas", icon: "email-open-outline" },
            ]}
            style={styles.segmentedButtons}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventFilters}
          >
            {notificationEventOptions.map((option) => {
              const selected = eventFilter === option.value;
              const eventColor =
                option.value === "all"
                  ? palette.primary
                  : getNotificationEventConfig(option.value).color;

              return (
                <Chip
                  key={option.value}
                  icon={option.icon}
                  selected={selected}
                  showSelectedCheck={false}
                  onPress={() => setEventFilter(option.value)}
                  style={[
                    styles.eventChip,
                    selected && {
                      backgroundColor: eventColor + "22",
                      borderColor: eventColor,
                    },
                  ]}
                  textStyle={[
                    styles.eventChipText,
                    selected && { color: eventColor },
                  ]}
                >
                  {option.label}
                </Chip>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.listContent}>
            {[1, 2, 3, 4, 5].map((item) => (
              <NotificationSkeleton key={item} />
            ))}
          </View>
        ) : (
          <FlatList
            data={visibleNotifications}
            renderItem={({ item, index }) => (
              <NotificationItem
                item={item}
                index={index}
                onPress={handleOpenNotification}
                handleMarkAsRead={handleMarkAsRead}
                handleDelete={handleDelete}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon source="bell-off-outline" size={62} color={palette.primary} />
                </View>
                <Text variant="titleLarge" style={styles.emptyTitle}>
                  No hay notificaciones
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {emptyMessage}
                </Text>
              </View>
            }
          />
        )}

        {!loading && unreadCount > 0 && (
          <FAB
            icon="email-open-multiple-outline"
            label="Marcar leidas"
            style={styles.fab}
            color="#fff"
            onPress={handleMarkAllAsRead}
            uppercase={false}
          />
        )}

        <Portal>
          <Modal
            visible={detailVisible && isDesktop}
            onDismiss={() => setDetailVisible(false)}
            contentContainerStyle={styles.detailModal}
          >
            <View style={styles.detailModalHeader}>
              <View>
                <Text variant="titleMedium" style={styles.detailModalTitle}>
                  Detalle de notificacion
                </Text>
                <Text variant="bodySmall" style={styles.detailModalSubtitle}>
                  Vista rapida para escritorio
                </Text>
              </View>
              <IconButton
                icon="close"
                size={20}
                iconColor={palette.textSecondary}
                onPress={() => setDetailVisible(false)}
                style={styles.closeButton}
              />
            </View>
            {selectedNotification && (
              <View style={[styles.detailModalBody, { height: Math.min(height - 150, 720) }]}>
                <NotificationDetailContent
                  notification={selectedNotification}
                  compact
                  onDelete={() => handleDelete(selectedNotification.id)}
                />
              </View>
            )}
          </Modal>
        </Portal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  headerPanel: {
    margin: 14,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary + "1F",
  },
  headerTextBlock: {
    flex: 1,
  },
  headerTitle: {
    color: palette.text,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  unreadSummary: {
    minWidth: 76,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: palette.background,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
  },
  unreadSummaryNumber: {
    color: palette.primary,
    fontSize: 22,
    fontWeight: "900",
  },
  unreadSummaryLabel: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  searchbar: {
    backgroundColor: palette.background,
    elevation: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    minHeight: 0,
    color: palette.text,
  },
  segmentedButtons: {
    elevation: 0,
  },
  eventFilters: {
    gap: 8,
    paddingRight: 4,
  },
  eventChip: {
    borderRadius: 8,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
  },
  eventChipText: {
    color: palette.textSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 0,
    paddingBottom: 104,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconContainer: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: palette.primary + "18",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    color: palette.text,
    fontWeight: "800",
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 440,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  detailModal: {
    alignSelf: "center",
    width: "92%",
    maxWidth: 760,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
  },
  detailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  detailModalTitle: {
    color: palette.text,
    fontWeight: "800",
  },
  detailModalSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    margin: 0,
    backgroundColor: palette.background,
  },
  detailModalBody: {
    borderRadius: 8,
    overflow: "hidden",
  },
});
