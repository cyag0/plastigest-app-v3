"use client";

import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import SectionHeader from "@/components/App/SectionHeader";
import KpiCard from "@/components/Dashboard/KpiCard";
import NotificationDetailContent from "@/components/Notifications/NotificationDetailContent";
import NotificationItem from "@/components/Notifications/NotificationItem";
import {
  getNotificationLink,
  notificationDetailRoute,
} from "@/components/Notifications/notificationLinks";
import {
  getNotificationEventConfig,
  notificationEventOptions,
} from "@/components/Notifications/notificationPresentation";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import services from "@/utils/services";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ReadFilter = "all" | "unread" | "read";
type EventFilter = "all" | App.Entities.NotificationEventType;

function matchesSearch(
  notification: App.Entities.Notification,
  rawSearch: string,
) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;

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

function FilterChip({
  selected,
  label,
  icon,
  color,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: any;
  color?: string;
  onPress: () => void;
}) {
  const accent = color ?? palette.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.filterChip,
        selected && {
          backgroundColor: hexWithAlpha(accent, 0.12),
          borderColor: accent,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={13}
        color={selected ? accent : palette.textSecondary}
      />
      <Text
        style={[
          styles.filterChipText,
          selected && { color: accent, fontWeight: "600" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
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
  const { loadUnreadNotificationsCount, unreadNotificationsCount } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;

  const [notifications, setNotifications] = useState<
    App.Entities.Notification[]
  >([]);
  const [total, setTotal] = useState(0);
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
  const [detailVisible, setDetailVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

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
        const meta = body?.meta;
        const lastPage = Number(meta?.last_page ?? pageToLoad);

        setNotifications((current) =>
          pageToLoad > 1 ? mergeById(current, items) : items,
        );
        setTotal(Number(meta?.total ?? items.length));
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

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        matchesSearch(notification, search),
      ),
    [notifications, search],
  );

  const hasActiveFilters = readFilter !== "all" || eventFilter !== "all";

  const setNotificationReadState = useCallback(
    (id: number, isRead: boolean) => {
      const readAt = isRead ? new Date().toISOString() : null;
      // Con el filtro "no leídas"/"leídas" la notificación sale de la vista.
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
      if (leavesView) setTotal((value) => Math.max(0, value - 1));
      setSelectedNotification((current) =>
        current?.id === id
          ? { ...current, is_read: isRead, read_at: readAt }
          : current,
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
      setSelectedNotification(notification);
      setDetailVisible(true);
      return;
    }
    router.push(notificationDetailRoute(notification.id) as any);
  };

  const openRelatedFromDetail = (route: string) => {
    setDetailVisible(false);
    setSelectedNotification(null);
    router.push(route as any);
  };

  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    setNotificationReadState(id, !isRead);
    try {
      if (isRead) {
        ignoreUnreadIncreaseRef.current = true;
        await services.notifications.markAsUnread(id);
        alerts.success("Marcada como no leída");
      } else {
        await services.notifications.markAsRead(id);
        alerts.success("Marcada como leída");
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
    const confirmed = await alerts.confirm(
      "¿Marcar todas las notificaciones como leídas?",
      {
        title: "Confirmar",
        okText: "Sí",
        cancelText: "Cancelar",
      },
    );
    if (!confirmed) return;
    try {
      await services.notifications.markAllAsRead();
      alerts.success("Todas las notificaciones marcadas como leídas");
      const readAt = new Date().toISOString();
      if (readFilter === "unread") {
        setNotifications([]);
        setTotal(0);
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
      title: "Confirmar eliminación",
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
      setTotal((value) => Math.max(0, value - 1));
      if (selectedNotification?.id === id) {
        setDetailVisible(false);
        setSelectedNotification(null);
      }
    } catch {
      alerts.error("Error al eliminar la notificación");
    } finally {
      loadUnreadNotificationsCount();
    }
  };

  const emptyMessage = useMemo(() => {
    if (search.trim()) return "No hay resultados para esa búsqueda.";
    if (eventFilter !== "all") {
      const label = getNotificationEventConfig(
        eventFilter,
      ).label.toLowerCase();
      return `No hay notificaciones de ${label} con estos filtros.`;
    }
    if (readFilter === "unread") return "No tienes notificaciones sin leer.";
    if (readFilter === "read") return "No tienes notificaciones leídas.";
    return "Las notificaciones aparecerán aquí cuando el sistema genere eventos.";
  }, [eventFilter, readFilter, search]);

  const activeFilterCount =
    (readFilter !== "all" ? 1 : 0) + (eventFilter !== "all" ? 1 : 0);
  const activeEventLabel =
    eventFilter === "all"
      ? null
      : notificationEventOptions.find((o) => o.value === eventFilter)?.label;

  const resetFilters = () => {
    setReadFilter("all");
    setEventFilter("all");
  };

  // ============== HEADER ==============
  const header = (
    <View>
      <View style={styles.headerCard}>
        <View style={styles.headerIconBox}>
          <MaterialCommunityIcons
            name="bell-badge-outline"
            size={22}
            color={palette.primary}
          />
        </View>
        <View style={styles.headerTextBlock}>
          <Text style={styles.eyebrow}>Bandeja de entrada</Text>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <Text style={styles.headerSubtitle}>
            Eventos del sistema y alertas operativas.
          </Text>
        </View>
        {unreadNotificationsCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="email-open-multiple-outline"
              size={14}
              color={palette.primary}
            />
            <Text style={styles.markAllText}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ============== KPI ==============
          "Sin leer" es el mismo número de la campana (toda la bandeja de la
          empresa); "Total" respeta los filtros. Antes se contaban sobre la
          lista ya filtrada y "Críticas" siempre daba 0. */}
      <View style={styles.kpiSection}>
        <View style={styles.kpiRow}>
          <KpiCard
            icon="email-mark-as-unread"
            label="Sin leer"
            value={String(unreadNotificationsCount)}
            inverseDelta={unreadNotificationsCount > 0}
          />
          <KpiCard
            icon="bell-outline"
            label={hasActiveFilters ? "Con estos filtros" : "Total"}
            value={String(total)}
          />
        </View>
      </View>

      {/* ============== SEARCH + FILTROS COMPACTOS ============== */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={palette.textMuted}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar notificación..."
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setFilterModalVisible(true)}
          style={[
            styles.filterButton,
            activeFilterCount > 0 && {
              backgroundColor: palette.primarySoft,
              borderColor: palette.primary,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={16}
            color={
              activeFilterCount > 0 ? palette.primary : palette.textSecondary
            }
          />
          <Text
            style={[
              styles.filterButtonText,
              activeFilterCount > 0 && {
                color: palette.primary,
                fontWeight: "600",
              },
            ]}
          >
            Filtros
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active filter chip (read filter) + event label */}
      {(readFilter !== "all" || activeEventLabel) && (
        <View style={styles.activeFiltersRow}>
          {readFilter !== "all" && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setReadFilter("all")}
              style={styles.activeChip}
            >
              <Text style={styles.activeChipText}>
                {readFilter === "unread" ? "Solo no leídas" : "Solo leídas"}
              </Text>
              <MaterialCommunityIcons
                name="close"
                size={12}
                color={palette.primary}
              />
            </TouchableOpacity>
          )}
          {activeEventLabel && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setEventFilter("all")}
              style={styles.activeChip}
            >
              <Text style={styles.activeChipText}>{activeEventLabel}</Text>
              <MaterialCommunityIcons
                name="close"
                size={12}
                color={palette.primary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={resetFilters} style={styles.clearAll}>
            <Text style={styles.clearAllText}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <SectionHeader
          title="Bandeja"
          badge={
            search.trim() ? `${visibleNotifications.length}` : `${total}`
          }
          rightSlot={
            unreadNotificationsCount > 0 ? (
              <AppChip variant="error" size="sm">
                {unreadNotificationsCount} sin leer
              </AppChip>
            ) : undefined
          }
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingList}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonIcon} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.skeletonLineLg} />
                  <View style={styles.skeletonLineMd} />
                  <View style={styles.skeletonLineSm} />
                </View>
              </View>
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
            ListHeaderComponent={header}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              hasMore ? (
                <View style={styles.loadMoreRow}>
                  {loadingMore ? (
                    <ActivityIndicator color={palette.primary} />
                  ) : (
                    <TouchableOpacity
                      onPress={loadMore}
                      activeOpacity={0.7}
                      style={styles.loadMoreButton}
                    >
                      <Text style={styles.loadMoreText}>Cargar más</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <EmptyState
                  icon="bell-off-outline"
                  title="No hay notificaciones"
                  description={emptyMessage}
                />
              </View>
            }
          />
        )}
      </View>

      {/* ============== MODAL: FILTROS ============== */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        readFilter={readFilter}
        setReadFilter={setReadFilter}
        eventFilter={eventFilter}
        setEventFilter={setEventFilter}
        onReset={resetFilters}
      />

      {/* ============== MODAL: DETALLE (desktop) ============== */}
      {isDesktop && selectedNotification && detailVisible && (
        <DetailModal
          notification={selectedNotification}
          onClose={() => setDetailVisible(false)}
          onDelete={() => handleDelete(selectedNotification.id)}
          onOpenLink={openRelatedFromDetail}
        />
      )}
    </SafeAreaView>
  );
}

// ============== SUBCOMPONENTES ==============

function FilterModal({
  visible,
  onClose,
  readFilter,
  setReadFilter,
  eventFilter,
  setEventFilter,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  readFilter: ReadFilter;
  setReadFilter: (v: ReadFilter) => void;
  eventFilter: EventFilter;
  setEventFilter: (v: EventFilter) => void;
  onReset: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.modalOverlay}
      >
        <TouchableOpacity activeOpacity={1} style={styles.filterModalCard}>
          <View style={styles.filterModalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>Filtros</Text>
              <Text style={styles.filterModalTitle}>Notificaciones</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.modalCloseBtn}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.filterModalBody}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>ESTADO DE LECTURA</Text>
              <View style={styles.filterGroupChips}>
                {(
                  [
                    {
                      v: "all" as const,
                      label: "Todas",
                      icon: "bell-outline",
                    },
                    {
                      v: "unread" as const,
                      label: "No leídas",
                      icon: "email-mark-as-unread",
                    },
                    {
                      v: "read" as const,
                      label: "Leídas",
                      icon: "email-open-outline",
                    },
                  ]
                ).map((opt) => (
                  <FilterChip
                    key={opt.v}
                    selected={readFilter === opt.v}
                    label={opt.label}
                    icon={opt.icon}
                    onPress={() => setReadFilter(opt.v)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>TIPO DE EVENTO</Text>
              <View style={styles.filterGroupChipsWrap}>
                {notificationEventOptions.map((option) => {
                  const selected = eventFilter === option.value;
                  const eventColor =
                    option.value === "all"
                      ? palette.primary
                      : getNotificationEventConfig(option.value).color;
                  return (
                    <FilterChip
                      key={option.value}
                      selected={selected}
                      label={option.label}
                      icon={option.icon}
                      color={eventColor}
                      onPress={() => setEventFilter(option.value)}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity
              onPress={onReset}
              activeOpacity={0.7}
              style={styles.filterModalResetBtn}
            >
              <Text style={styles.filterModalResetText}>Limpiar todo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={styles.filterModalApplyBtn}
            >
              <Text style={styles.filterModalApplyText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function DetailModal({
  notification,
  onClose,
  onDelete,
  onOpenLink,
}: {
  notification: App.Entities.Notification;
  onClose: () => void;
  onDelete: () => void;
  onOpenLink: (route: string) => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.modalOverlay}
      >
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalEyebrow}>Detalle de notificación</Text>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {notification.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.modalCloseBtn}
            >
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={palette.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalBody, { padding: 24 }]}>
            <NotificationDetailContent
              notification={notification}
              compact
              onDelete={onDelete}
              onOpenLink={onOpenLink}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============== STYLES ==============

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },

  // --- Header card ---
  headerCard: {
    flexDirection: "row",
    // En pantallas angostas "Marcar todas" baja de renglón en vez de partir
    // el título ("Notific-aciones").
    flexWrap: "wrap",
    alignItems: "center",
    backgroundColor: palette.surface,
    marginHorizontal: tokens.spacing[5],
    marginTop: tokens.spacing[5],
    marginBottom: tokens.spacing[5],
    padding: tokens.spacing[5],
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing[4],
    ...tokens.shadow.sm,
  },
  headerIconBox: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 190,
    gap: 2,
  },
  eyebrow: {
    ...tokens.typography.micro,
    color: palette.primary,
  },
  headerTitle: {
    ...tokens.typography.h1,
    color: palette.text,
  },
  headerSubtitle: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: tokens.spacing[2],
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
  },
  markAllText: {
    ...tokens.typography.bodySm,
    color: palette.primary,
    fontWeight: "500",
  },

  // --- KPI ---
  kpiSection: {
    paddingHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[4],
  },
  kpiRow: {
    flexDirection: "row",
    gap: tokens.spacing[3],
    marginBottom: tokens.spacing[3],
  },

  // --- Toolbar (search + filter button) ---
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[3],
    gap: tokens.spacing[2],
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surfaceMuted,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing[3],
    height: 36,
    gap: tokens.spacing[2],
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.body,
    color: palette.text,
    padding: 0,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 8,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
    height: 36,
  },
  filterButtonText: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    fontWeight: "500",
  },

  // --- Active filters row ---
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[3],
    gap: 6,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[2] + 2,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.primarySoft,
  },
  activeChipText: {
    ...tokens.typography.caption,
    color: palette.primary,
    fontWeight: "500",
  },
  clearAll: {
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: 4,
  },
  clearAllText: {
    ...tokens.typography.caption,
    color: palette.textMuted,
    textDecorationLine: "underline",
  },

  // --- Section header ---
  sectionHeader: {
    paddingHorizontal: tokens.spacing[5],
  },

  // --- List ---
  listContent: {
    paddingBottom: tokens.spacing[10],
  },
  emptyContainer: {
    paddingTop: tokens.spacing[5],
  },
  loadMoreRow: {
    alignItems: "center",
    paddingVertical: tokens.spacing[4],
  },
  loadMoreButton: {
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[2],
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primarySoft,
  },
  loadMoreText: {
    ...tokens.typography.bodySm,
    color: palette.primary,
    fontWeight: "600",
  },

  // --- Loading skeleton ---
  loadingList: {
    padding: tokens.spacing[5],
    gap: tokens.spacing[3],
  },
  skeletonRow: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
    ...tokens.shadow.sm,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.surfaceMuted,
  },
  skeletonLineLg: {
    width: "70%",
    height: 14,
    borderRadius: 4,
    backgroundColor: palette.surfaceMuted,
  },
  skeletonLineMd: {
    width: "90%",
    height: 12,
    borderRadius: 4,
    backgroundColor: palette.surfaceMuted,
  },
  skeletonLineSm: {
    width: "40%",
    height: 10,
    borderRadius: 4,
    backgroundColor: palette.surfaceMuted,
  },

  // --- Filter modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing[5],
  },
  filterModalCard: {
    width: "min(520px, 92vw)" as any,
    maxHeight: "85vh" as any,
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    ...tokens.shadow.lg,
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3] + 2,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  filterModalTitle: {
    ...tokens.typography.h2,
    color: palette.text,
    marginTop: 2,
  },
  filterModalBody: {
    padding: tokens.spacing[4],
    gap: tokens.spacing[5],
  },
  filterGroup: {
    gap: tokens.spacing[2],
  },
  filterGroupLabel: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  filterGroupChips: {
    flexDirection: "row",
    gap: tokens.spacing[2],
  },
  filterGroupChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[2],
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipText: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
  },
  filterModalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: tokens.spacing[3],
    backgroundColor: palette.surfaceMuted,
  },
  filterModalResetBtn: {
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 8,
  },
  filterModalResetText: {
    ...tokens.typography.bodyMd,
    color: palette.textSecondary,
  },
  filterModalApplyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.primary,
    alignItems: "center",
  },
  filterModalApplyText: {
    ...tokens.typography.bodyMd,
    color: palette.textInverse,
    fontWeight: "600",
  },

  // --- Detail modal (desktop) ---
  modalCard: {
    width: "min(760px, 92vw)" as any,
    maxHeight: "88vh" as any,
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    ...tokens.shadow.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing[4],
    paddingVertical: tokens.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    gap: tokens.spacing[3],
  },
  modalEyebrow: {
    ...tokens.typography.micro,
    color: palette.textMuted,
  },
  modalTitle: {
    ...tokens.typography.h3,
    color: palette.text,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    maxHeight: 600,
  },
});
