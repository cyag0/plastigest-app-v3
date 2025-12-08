import SkeletonLoader from "@/components/SkeletonLoader";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, IconButton, Text } from "react-native-paper";

type NotificationType = "info" | "success" | "warning" | "error" | "alert";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const { loadUnreadNotificationsCount } = useAuth();
  const [notification, setNotification] =
    useState<App.Entities.Notification | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNotification = async () => {
    try {
      console.log("Loading notification with id:", id);
      if (!id) return;

      setLoading(true);

      const response = await Services.notifications.show(parseInt(id));
      const notif = response.data;
      setNotification(notif);

      // Marcar como leída si no lo está
      if (!notif.is_read) {
        await Services.notifications.markAsRead(notif.id);
        loadUnreadNotificationsCount();
      }
    } catch (error: any) {
      console.error("Error loading notification:", error);
      alerts.error("Error al cargar la notificación");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotification();
    }, [id])
  );

  const handleDelete = async () => {
    try {
      const confirmed = await alerts.confirm("¿Eliminar esta notificación?", {
        title: "Confirmar eliminación",
        okText: "Eliminar",
        cancelText: "Cancelar",
      });

      if (!confirmed) return;

      await Services.notifications.destroy(parseInt(id));
      alerts.success("Notificación eliminada");
      loadUnreadNotificationsCount();
      router.back();
    } catch (error) {
      alerts.error("Error al eliminar la notificación");
    }
  };

  const getTypeColor = (type: NotificationType) => {
    switch (type) {
      case "success":
        return palette.success;
      case "error":
        return palette.error;
      case "warning":
        return palette.warning;
      case "alert":
        return palette.red;
      case "info":
      default:
        return palette.blue;
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return "check-circle";
      case "error":
        return "alert-circle";
      case "warning":
        return "alert";
      case "alert":
        return "bell-alert";
      case "info":
      default:
        return "information";
    }
  };

  if (loading || !notification) {
    return (
      <View style={styles.container}>
        <SkeletonLoader count={1} />
      </View>
    );
  }

  const typeColor = getTypeColor(notification.type);
  const typeIcon = getTypeIcon(notification.type);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: typeColor + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name={typeIcon as any}
                  size={28}
                  color={typeColor}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.typeLabel}>
                  {notification.type.toUpperCase()}
                </Text>
                <Text variant="bodySmall" style={styles.date}>
                  {new Date(notification.created_at).toLocaleDateString(
                    "es-MX",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </Text>
              </View>

              <IconButton
                icon="delete-outline"
                size={20}
                iconColor={palette.error}
                onPress={handleDelete}
                style={{ margin: 0 }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Title & Message Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.title}>
              {notification.title}
            </Text>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.message}>
              {notification.message}
            </Text>
          </Card.Content>
        </Card>

        {/* Additional Data Card (if exists) */}
        {notification.data && notification.data.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color={palette.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Información Adicional
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.dataContainer}>
                {notification.data.map((item: any, index: number) => (
                  <View key={index} style={styles.dataRow}>
                    <Text variant="bodySmall" style={styles.dataLabel}>
                      {item.label}
                    </Text>
                    <Text variant="bodyMedium" style={styles.dataValue}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.backButton}
          icon="arrow-left"
        >
          Volver
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: palette.surface,
    borderRadius: 12,
    shadowColor: "transparent",
    elevation: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  typeLabel: {
    color: palette.text,
    fontWeight: "600",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  date: {
    color: palette.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    marginBottom: 16,
    backgroundColor: palette.surface,
    borderRadius: 12,
    shadowColor: "transparent",
    elevation: 0,
  },
  title: {
    color: palette.text,
    fontWeight: "700",
    lineHeight: 28,
  },
  divider: {
    marginVertical: 12,
    backgroundColor: palette.border || "#e0e0e0",
  },
  message: {
    color: palette.text,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: palette.text,
    fontWeight: "600",
  },
  dataContainer: {
    gap: 12,
  },
  dataRow: {
    gap: 4,
  },
  dataLabel: {
    color: palette.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dataValue: {
    color: palette.text,
    fontWeight: "500",
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border || "#e0e0e0",
  },
  backButton: {
    borderColor: palette.primary,
  },
});
