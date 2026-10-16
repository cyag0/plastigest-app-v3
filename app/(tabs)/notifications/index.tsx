import AppListFilterBar, { type FilterConfig } from "@/components/App/AppList/AppListFilter";
import EmptyState from "@/components/App/EmptyState";
import {
  ListGroupItem,
  ListGroupSkeleton,
  ListSectionTitle,
} from "@/components/App/ListGroup";
import ListSearchbar from "@/components/App/ListSearchbar";
import NotificationDetailModal from "@/components/Notifications/NotificationDetailModal";
import NotificationRow from "@/components/Notifications/NotificationRow";
import {
  getNotificationLink,
  notificationDetailRoute,
} from "@/components/Notifications/notificationLinks";
import {
  getNotificationCategoryLabel,
  groupNotifications,
  notificationEventOptions,
} from "@/components/Notifications/notificationPresentation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import services from "@/utils/services";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReadFilter = "all" | "unread" | "read";
type EventFilter = "all" | App.Entities.NotificationEventType;

// Mismo aspecto que los filtros de los listados ("Mostrar: Todas •").
const FILTERS: FilterConfig[] = [
  {
    type: "simple",
    name: "read",
    label: "Mostrar",
    options: [
      { label: "Todas", value: "all" },
      { label: "Sin leer", value: "unread" },
      { label: "Leídas", value: "read" },
    ],
  },
  { type: "simple", name: "event", label: "Tipo", options: notificationEventOptions },
];

function matchesSearch(
  notification: App.Entities.Notification,
  rawSearch: string,
) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;

  const dataText = notification.data ? JSON.stringify(notification.data) : "";

  return [
    notification.title,
    notification.message,
    getNotificationCategoryLabel(notification.event_type),
    dataText,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(search));
}

// Página de la bandeja: antes se pedía la bandeja completa (all) en cada
// foco y después de cada acción.
const PAGE_SIZE = 30;

function mergeById(
  current: App.Entities.Notification[],
  next: App.Entities.Notification[],
) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

export default function NotificationsScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { loadUnreadNotificationsCount, unreadNotificationsCount } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;
  const wide = width >= 768;

  const [notifications, setNotifications] = useState<
    App.Entities.Notification[]
  >([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedNotification, setSelectedNotification] =
    useState<App.Entities.Notification | null>(null);

  // Descarta respuestas viejas si cambian los filtros a media carga.
  const requestIdRef = useRef(0);
  const focusedRef = useRef(false);

  const loadNotifications = useCallback(
    async (pageToLoad = 1) => {
      const requestId = ++requestIdRef.current;
      try {
        if (pageToLoad > 1) setLoadingMore(true);
        const params: Record<string, string | number> = {
          per_page: PAGE_SIZE,
          page: pageToLoad,
        };
        if (readFilter === "unread") params.read = "false";
        if (readFilter === "read") params.read = "true";
        if (eventFilter !== "all") params.event_type = eventFilter;

        const response = await services.notifications.index(params);
        if (requestId !== requestIdRef.current) return;
        const body = response.data as any;
        const items: App.Entities.Notification[] = Array.isArray(body)
          ? body
          : body?.data || [];
        const lastPage = Number(body?.meta?.last_page ?? pageToLoad);

        setNotifications((current) =>
          pageToLoad > 1 ? mergeById(current, items) : items,
        );
        setPage(pageToLoad);
        setHasMore(pageToLoad < lastPage);
      } catch (error: any) {
        if (requestId !== requestIdRef.current) return;
        alerts.error(
          error.response?.data?.message || "Error al cargar las notificaciones",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [alerts, eventFilter, readFilter],
  );

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      void loadNotifications(1);
      return () => {
        focusedRef.current = false;
      };
    }, [loadNotifications]),
  );

  // Llegó algo nuevo (push recibido o el refresco periódico del contador)
  // con la bandeja abierta: se recarga la primera página. Los cambios hechos
  // aquí mismo (marcar como no leída) no recargan.
  const lastUnreadRef = useRef(unreadNotificationsCount);
  const ignoreUnreadIncreaseRef = useRef(false);
  useEffect(() => {
    const previous = lastUnreadRef.current;
    lastUnreadRef.current = unreadNotificationsCount;
    if (unreadNotificationsCount <= previous) return;
    if (ignoreUnreadIncreaseRef.current) {
      ignoreUnreadIncreaseRef.current = false;
      return;
    }
    if (focusedRef.current) void loadNotifications(1);
  }, [unreadNotificationsCount, loadNotifications]);

  const sections = useMemo(
    () =>
      groupNotifications(
        notifications.filter((notification) => matchesSearch(notification, search)),
      ),
    [notifications, search],
  );

  const hasActiveFilters =
    readFilter !== "all" || eventFilter !== "all" || !!search.trim();

  const setNotificationReadState = useCallback(
    (id: number, isRead: boolean) => {
      const readAt = isRead ? new Date().toISOString() : null;
      // Con el filtro "sin leer"/"leídas" la notificación sale de la vista.
      const leavesView =
        (readFilter === "unread" && isRead) || (readFilter === "read" && !isRead);
      setNotifications((current) =>
        leavesView
          ? current.filter((notification) => notification.id !== id)
          : current.map((notification) =>
              notification.id === id
                ? { ...notification, is_read: isRead, read_at: readAt }
                : notification,
            ),
      );
    },
    [readFilter],
  );

  const markAsReadSilently = useCallback(
    async (notification: App.Entities.Notification) => {
      if (notification.is_read) return;
      setNotificationReadState(notification.id, true);
      try {
        await services.notifications.markAsRead(notification.id);
      } catch (error) {
        console.warn("No se pudo marcar como leída:", error);
      } finally {
        loadUnreadNotificationsCount();
      }
    },
    [loadUnreadNotificationsCount, setNotificationReadState],
  );

  const onRefresh = () => {
    setRefreshing(true);
    void loadNotifications(1);
    loadUnreadNotificationsCount();
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    void loadNotifications(page + 1);
  };

  // Abre el registro relacionado (tarea, compra, transferencia…) igual que
  // la campana y el push; sin id relacionado, el detalle de la notificación.
  const handleOpenNotification = (
    notification: App.Entities.Notification,
  ) => {
    const target = getNotificationLink(
      notification.event_type,
      notification.data,
    );
    void markAsReadSilently(notification);
    if (target) {
      router.push(target.route as any);
      return;
    }
    if (isDesktop) {
      setSelectedNotification({ ...notification, is_read: true });
      return;
    }
    router.push(notificationDetailRoute(notification.id) as any);
  };

  const openRelatedFromDetail = (route: string) => {
    setSelectedNotification(null);
    router.push(route as any);
  };

  const handleToggleRead = async (notification: App.Entities.Notification) => {
    const { id, is_read: isRead } = notification;
    setNotificationReadState(id, !isRead);
    try {
      if (isRead) {
        ignoreUnreadIncreaseRef.current = true;
        await services.notifications.markAsUnread(id);
      } else {
        await services.notifications.markAsRead(id);
      }
    } catch {
      ignoreUnreadIncreaseRef.current = false;
      alerts.error("Error al actualizar la notificación");
      void loadNotifications(1);
    } finally {
      loadUnreadNotificationsCount();
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await services.notifications.markAllAsRead();
      alerts.success("Todas las notificaciones quedaron leídas");
      const readAt = new Date().toISOString();
      if (readFilter === "unread") {
        setNotifications([]);
        setHasMore(false);
      } else {
        setNotifications((current) =>
          current.map((notification) => ({
            ...notification,
            is_read: true,
            read_at: notification.read_at ?? readAt,
          })),
        );
      }
    } catch {
      alerts.error("Error al marcar todas como leídas");
    } finally {
      loadUnreadNotificationsCount();
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await alerts.confirm("¿Eliminar esta notificación?", {
      title: "Eliminar notificación",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!confirmed) return;
    try {
      await services.notifications.destroy(id);
      alerts.success("Notificación eliminada");
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
      if (selectedNotification?.id === id) setSelectedNotification(null);
    } catch {
      alerts.error("Error al eliminar la notificación");
    } finally {
      loadUnreadNotificationsCount();
    }
  };

  const resetFilters = () => {
    setReadFilter("all");
    setEventFilter("all");
    setSearch("");
  };

  const emptyTitle = search.trim()
    ? "Sin resultados"
    : readFilter === "unread" && eventFilter === "all"
      ? "Estás al día"
      : hasActiveFilters
        ? "No hay notificaciones con estos filtros"
        : "No tienes notificaciones";
  const emptyDescription = search.trim()
    ? "No hay notificaciones que coincidan con la búsqueda."
    : readFilter === "unread" && eventFilter === "all"
      ? "No tienes notificaciones sin leer."
      : hasActiveFilters
        ? undefined
        : "Aquí te avisaremos de tareas, transferencias, compras y stock bajo.";

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    contentWide: { padding: 28, maxWidth: 880, width: "100%", alignSelf: "center" },
    // AppListFilterBar trae su propio margen lateral de 16 (el de AppList).
    filters: { marginTop: 8, marginLeft: -16, marginRight: -16 },
    groupTitle: { marginTop: 22, marginBottom: 8 },
    firstGroupTitle: { marginTop: 8 },
    loadingBlock: { marginTop: 16 },
    footer: { alignItems: "center", paddingTop: 16 },
    loadMore: { paddingHorizontal: 16, paddingVertical: 8 },
    loadMoreText: { fontSize: 14, fontWeight: "600", color: c.primary },
  }));

  const header = (
    <View>
      <ListSearchbar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar notificaciones..."
      />
      <View style={styles.filters}>
        <AppListFilterBar
          filters={FILTERS}
          values={{ read: readFilter, event: eventFilter }}
          onChange={(values) => {
            // "Limpiar" en el filtro deja "": se vuelve a "todas".
            setReadFilter((values.read || "all") as ReadFilter);
            setEventFilter((values.event || "all") as EventFilter);
          }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <SectionList
        sections={loading ? [] : sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <ListSectionTitle
            title={section.title}
            style={[styles.groupTitle, section.key === sections[0]?.key && styles.firstGroupTitle]}
            action={
              section.key === sections[0]?.key && unreadNotificationsCount > 0
                ? { label: "Marcar todas como leídas", onPress: handleMarkAllAsRead }
                : undefined
            }
          />
        )}
        renderItem={({ item, index, section }) => (
          <ListGroupItem first={index === 0} last={index === section.data.length - 1}>
            <NotificationRow
              notification={item}
              onPress={handleOpenNotification}
              onToggleRead={handleToggleRead}
              onDelete={(notification) => handleDelete(notification.id)}
            />
          </ListGroupItem>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore && !loading ? (
            <View style={styles.footer}>
              {loadingMore ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Pressable onPress={loadMore} hitSlop={8} style={styles.loadMore}>
                  <Text style={styles.loadMoreText}>Cargar más</Text>
                </Pressable>
              )}
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingBlock}>
              <ListGroupSkeleton rows={5} />
            </View>
          ) : (
            <EmptyState
              icon={hasActiveFilters ? "bell-off-outline" : "bell-check-outline"}
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          )
        }
      />

      {/* Detalle en escritorio, para avisos que no llevan a otra pantalla. */}
      {isDesktop && (
        <NotificationDetailModal
          notification={selectedNotification}
          onDismiss={() => setSelectedNotification(null)}
          onDelete={
            selectedNotification
              ? () => handleDelete(selectedNotification.id)
              : undefined
          }
          onOpenLink={openRelatedFromDetail}
        />
      )}
    </SafeAreaView>
  );
}
