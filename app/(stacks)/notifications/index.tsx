"use client";

import SkeletonLoader from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Card,
  Chip,
  Divider,
  FAB,
  Icon,
  IconButton,
  Searchbar,
  SegmentedButtons,
  Text,
  Button,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "all" | "unread" | "read";
type NotificationType = "info" | "success" | "warning" | "error" | "alert";

function NotificationSkeleton() {
  return (
    <Card style={styles.skeletonCard}>
      <Card.Content style={styles.cardContent}>
        <View>
          <SkeletonLoader width={24} height={24} borderRadius={12} />
        </View>
        <View style={{ flex: 1 }}>
          <SkeletonLoader
            width="100%"
            height={20}
            style={{ marginBottom: 8 }}
          />
          <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
      </Card.Content>
    </Card>
  );
}

function NotificationItem({
  item,
  onPress,
  getTypeConfig,
  handleMarkAsRead,
  handleDelete,
  index,
}: {
  item: App.Entities.Notification;
  onPress: (id: number) => void;
  getTypeConfig: (type: NotificationType) => any;
  handleMarkAsRead: (id: number, isRead: boolean) => Promise<void>;
  handleDelete: (id: number) => Promise<void>;
  index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        delay: index * 50,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        delay: index * 50,
      }),
    ]).start();
  }, []);

  const typeConfig = getTypeConfig(item.type);

  return (
    <Animated.View
      style={[
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        styles.animatedContainer,
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(item.id)}
        activeOpacity={0.6}
        style={styles.touchable}
      >
        <Card
          style={[
            styles.card,
            {
              shadowColor: "transparent",
            },
            !item.is_read && {
              backgroundColor: palette.primary + "12",
              borderLeftWidth: 4,
              borderLeftColor: palette.primary,
            },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            {/* Icon Badge */}
            <View
              style={[styles.iconBadge, { backgroundColor: typeConfig.bg }]}
            >
              <Icon
                source={typeConfig.icon}
                size={24}
                color={typeConfig.color}
              />
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              {/* Header with Badge and Type */}
              <View style={styles.headerRow}>
                <View style={styles.badgesContainer}>
                  {!item.is_read && (
                    <View style={styles.unreadBadge}>
                      <View style={styles.unreadDot} />
                      <Text style={styles.unreadBadgeText}>NUEVO</Text>
                    </View>
                  )}
                  <Chip
                    mode="flat"
                    compact
                    textStyle={[
                      styles.typeChipText,
                      { color: typeConfig.color },
                    ]}
                    style={[
                      styles.typeChip,
                      { backgroundColor: typeConfig.bg },
                    ]}
                  >
                    {typeConfig.label}
                  </Chip>
                </View>
              </View>

              {/* Title */}
              <Text
                variant="titleMedium"
                style={[styles.title, !item.is_read && { fontWeight: "700" }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* Message */}
              <Text
                variant="bodyMedium"
                style={styles.message}
                numberOfLines={2}
              >
                {item.message}
              </Text>

              {/* Divider */}
              <Divider style={styles.divider} />

              {/* Footer with Date and Actions */}
              <View style={styles.footerRow}>
                <View style={styles.dateContainer}>
                  <Icon
                    source="clock-outline"
                    size={13}
                    color={palette.textSecondary}
                  />
                  <Text variant="bodySmall" style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View style={styles.actionButtons}>
                  <IconButton
                    icon={item.is_read ? "email-outline" : "email-open"}
                    size={16}
                    iconColor={
                      item.is_read ? palette.textSecondary : palette.primary
                    }
                    onPress={() => handleMarkAsRead(item.id, item.is_read)}
                    style={styles.iconButton}
                  />
                  <IconButton
                    icon="delete-outline"
                    size={16}
                    iconColor={palette.error}
                    onPress={() => handleDelete(item.id)}
                    style={styles.iconButton}
                  />
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { loadUnreadNotificationsCount } = useAuth();
  const [notifications, setNotifications] = useState<
    App.Entities.Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const loadNotifications = async () => {
    try {
      const params: any = { all: true };
      if (filter === "unread") {
        params.read = "false";
      } else if (filter === "read") {
        params.read = "true";
      }
      if (search) {
        params.search = search;
      }
      
      console.log("Cargando notificaciones con params:", params);
      const response = await Services.notifications.index(params);
      console.log("Respuesta del servidor:", response);
      
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      
      console.log("Notificaciones cargadas:", data.length);
      setNotifications(data);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
      console.error("Error details:", error.response?.data || error.message);
      alerts.error(
        error.response?.data?.message || "Error al cargar las notificaciones"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [filter, search])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (id: number, isRead: boolean) => {
    try {
      if (isRead) {
        await Services.notifications.markAsUnread(id);
        alerts.success("Marcada como no leída");
      } else {
        await Services.notifications.markAsRead(id);
        alerts.success("Marcada como leída");
      }
      loadNotifications();
      loadUnreadNotificationsCount();
    } catch (error) {
      alerts.error("Error al actualizar la notificación");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const confirmed = await alerts.confirm(
        "¿Marcar todas las notificaciones como leídas?",
        {
          title: "Confirmar",
          okText: "Sí",
          cancelText: "Cancelar",
        }
      );
      if (!confirmed) return;
      await Services.notifications.markAllAsRead();
      alerts.success("Todas las notificaciones marcadas como leídas");
      loadNotifications();
      loadUnreadNotificationsCount();
    } catch (error) {
      alerts.error("Error al marcar todas como leídas");
    }
  };

  const handleCreateTestNotifications = async () => {
    try {
      await Services.notifications.createTestNotifications();
      alerts.success("Notificaciones de prueba creadas");
      loadNotifications();
      loadUnreadNotificationsCount();
    } catch (error) {
      alerts.error("Error al crear notificaciones de prueba");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const confirmed = await alerts.confirm("¿Eliminar esta notificación?", {
        title: "Confirmar eliminación",
        okText: "Eliminar",
        cancelText: "Cancelar",
      });
      if (!confirmed) return;
      await Services.notifications.destroy(id);
      alerts.success("Notificación eliminada");
      loadNotifications();
      loadUnreadNotificationsCount();
    } catch (error) {
      alerts.error("Error al eliminar la notificación");
    }
  };

  const getTypeConfig = (type: NotificationType) => {
    switch (type) {
      case "success":
        return {
          color: palette.success,
          icon: "check-circle",
          bg: palette.success + "20",
          label: "Éxito",
        };
      case "error":
        return {
          color: palette.error,
          icon: "alert-circle",
          bg: palette.error + "20",
          label: "Error",
        };
      case "warning":
        return {
          color: palette.warning,
          icon: "alert",
          bg: palette.warning + "20",
          label: "Aviso",
        };
      case "alert":
        return {
          color: palette.red,
          icon: "bell-alert",
          bg: palette.red + "20",
          label: "Alerta",
        };
      case "info":
      default:
        return {
          color: palette.info,
          icon: "information",
          bg: palette.info + "20",
          label: "Info",
        };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <View style={styles.container}>
        {/* Search */}
        <Searchbar
          placeholder="Buscar notificaciones..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          mode="bar"
          icon="magnify"
        />

        {/* Filter */}
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as FilterType)}
          buttons={[
            {
              value: "all",
              label: "Todas",
              icon: "bell",
            },
            {
              value: "unread",
              label: "No leídas",
              icon: "email",
            },
            {
              value: "read",
              label: "Leídas",
              icon: "email-open",
            },
          ]}
          style={styles.segmentedButtons}
        />

        {/* List with skeleton */}
        {loading ? (
          <View style={styles.listContent}>
            {[1, 2, 3, 4, 5].map((i) => (
              <NotificationSkeleton key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={({ item, index }) => (
              <NotificationItem
                item={item}
                index={index}
                onPress={(id) => {
                  console.log("Navigating to notification id:", id);
                  router.push(`/(stacks)/notifications/${id}` as any);
                }}
                getTypeConfig={getTypeConfig}
                handleMarkAsRead={handleMarkAsRead}
                handleDelete={handleDelete}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon
                    source="bell-off-outline"
                    size={64}
                    color={palette.primary}
                  />
                </View>
                <Text variant="titleLarge" style={styles.emptyTitle}>
                  No hay notificaciones
                </Text>
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {filter === "unread"
                    ? "No tienes notificaciones sin leer"
                    : filter === "read"
                    ? "No tienes notificaciones leídas"
                    : "No tienes ninguna notificación"}
                </Text>
                <Text 
                  variant="bodySmall" 
                  style={[styles.emptyText, { marginTop: 8, fontStyle: 'italic' }]}
                >
                  Las notificaciones aparecerán aquí cuando se generen eventos en el sistema
                </Text>
                <Button
                  mode="contained"
                  onPress={handleCreateTestNotifications}
                  style={{ marginTop: 16 }}
                  icon="test-tube"
                >
                  Crear notificaciones de prueba
                </Button>
              </View>
            }
          />
        )}

        {/* FAB para marcar todas como leídas */}
        {!loading && notifications.some((n) => !n.is_read) && (
          <FAB
            icon="email-open-multiple"
            label="Marcar todas leídas"
            style={styles.fab}
            color="#fff"
            onPress={handleMarkAllAsRead}
            uppercase={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: palette.text,
    fontWeight: "800",
  },
  searchbar: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: palette.card,
    elevation: 0,
    borderRadius: 12,
  },
  segmentedButtons: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 0,
  },
  listContent: {
    padding: 12,
    paddingTop: 0,
    paddingBottom: 100,
  },
  animatedContainer: {
    marginHorizontal: 4,
    marginVertical: 6,
  },
  touchable: {
    borderRadius: 16,
  },
  card: {
    borderRadius: 16,
    elevation: 2,
    backgroundColor: palette.card,
    overflow: "hidden",
  },
  skeletonCard: {
    borderRadius: 16,
    elevation: 2,
    backgroundColor: palette.card,
    marginHorizontal: 4,
    marginVertical: 6,
  },
  cardContent: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  typeChip: {
    height: 32,
    borderRadius: 8,
    marginHorizontal: 0,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    color: palette.text,
    lineHeight: 22,
    fontWeight: "600",
  },
  message: {
    color: palette.textSecondary,
    lineHeight: 20,
    fontSize: 13,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: palette.border,
    height: 0.8,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  date: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 0,
    marginRight: -8,
  },
  iconButton: {
    margin: 0,
    width: 32,
    height: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    gap: 16,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.primary + "18",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    color: palette.text,
    fontWeight: "700",
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
    fontSize: 14,
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: palette.primary,
    borderRadius: 28,
  },
});
