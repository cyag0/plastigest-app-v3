import AppSelect from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Divider,
  Text,
} from "react-native-paper";

interface NotificationConfig {
  enabled: boolean;
  users: number[];
}

export default function NotificationsSettingsScreen() {
  const { selectedCompany, location } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<App.Entities.LocationSettings>({});
  const [workers, setWorkers] = useState<App.Entities.Worker[]>([]);

  useEffect(() => {
    if (location && selectedCompany) {
      loadData();
    }
  }, [location, selectedCompany]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSettings(), loadWorkers()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    if (!location) return;

    try {
      const response = await Services.admin.settings.getSettings(location.id);
      setSettings(response.data.data || {});
    } catch (error) {
      console.error("Error loading settings:", error);
      // Fallback to default settings
      setSettings({
        notifications: {
          low_stock: { enabled: true, users: [] },
          purchase_confirmed: { enabled: true, users: [] },
          transfer_received: { enabled: true, users: [] },
          inventory_discrepancies: { enabled: true, users: [] },
          adjustment_created: { enabled: true, users: [] },
        },
      });
    }
  };

  const loadWorkers = async () => {
    if (!selectedCompany) return;

    try {
      const response = await Services.admin.workers.index({
        company_id: selectedCompany.id,
        location_id: location?.id,
        //is_active: true,
      });
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setWorkers(data);
    } catch (error) {
      console.error("Error loading workers:", error);
    }
  };

  const autoSave = async (newSettings: App.Entities.LocationSettings) => {
    if (!location) return;

    try {
      await Services.admin.settings.updateSettings(location.id, newSettings);
    } catch (error) {
      console.error("Error auto-saving settings:", error);
      Alert.alert("Error", "No se pudo guardar la configuración");
    }
  };

  const updateNotificationUsers = async (key: string, users: number[]) => {
    setSaving(key);

    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: {
          ...settings.notifications?.[key],
          users,
        },
      },
    };

    setSettings(newSettings);
    await autoSave(newSettings);
    setSaving(null);
  };

  const removeUser = async (notificationKey: string, userId: number) => {
    const currentUsers = settings.notifications?.[notificationKey]?.users || [];
    const newUsers = currentUsers.filter((id) => id !== userId);
    await updateNotificationUsers(notificationKey, newUsers);
  };

  const getUserName = (userId: number) => {
    const worker = workers.find((w) => w.user_id === userId);
    return worker?.user?.name || `Usuario #${userId}`;
  };

  const getAvailableUsers = (notificationKey: string) => {
    const assignedUsers =
      settings.notifications?.[notificationKey]?.users || [];
    return workers
      .filter((w) => !assignedUsers.includes(w.user_id))
      .map((w) => ({
        label: w.user_name || `Usuario #${w.user_id}`,
        value: w.user_id,
      }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  const notificationTypes = [
    {
      key: "low_stock",
      title: "Stock Bajo",
      description: "Notificar cuando un producto alcance el stock mínimo",
      icon: "package-variant-closed",
      color: palette.warning,
    },
    {
      key: "purchase_confirmed",
      title: "Compra Confirmada",
      description:
        "Notificar cuando un proveedor confirme una compra vía WhatsApp",
      icon: "cart-check",
      color: palette.primary,
    },
    {
      key: "transfer_received",
      title: "Transferencia Recibida",
      description: "Notificar cuando llegue una transferencia de otra sucursal",
      icon: "truck-delivery",
      color: palette.blue,
    },
    {
      key: "inventory_discrepancies",
      title: "Diferencias en Conteo",
      description:
        "Notificar cuando haya diferencias en el conteo de inventario",
      icon: "alert-circle",
      color: palette.error,
    },
    {
      key: "adjustment_created",
      title: "Ajuste Creado",
      description: "Notificar cuando se cree un ajuste de inventario",
      icon: "clipboard-edit",
      color: palette.secondary,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={palette.blue}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.infoText}>
                  Selecciona qué usuarios recibirán notificaciones para cada
                  tipo de evento. Los cambios se guardan automáticamente.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Notification Types */}
        {notificationTypes.map((type, index) => {
          const config = settings.notifications?.[type.key] || {
            enabled: true,
            users: [],
          };
          const assignedUsers = config.users || [];
          const isSaving = saving === type.key;

          return (
            <Card key={type.key} style={styles.card}>
              <Card.Content>
                {/* Header */}
                <View style={styles.notificationHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: type.color + "20" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={type.icon as any}
                      size={24}
                      color={type.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="titleMedium"
                      style={styles.notificationTitle}
                    >
                      {type.title}
                    </Text>
                    <Text variant="bodySmall" style={styles.description}>
                      {type.description}
                    </Text>
                  </View>
                  {isSaving && (
                    <ActivityIndicator size="small" color={palette.primary} />
                  )}
                </View>

                <Divider style={styles.divider} />

                {/* Assigned Users */}
                <View style={styles.usersSection}>
                  <Text variant="labelMedium" style={styles.sectionLabel}>
                    Usuarios que recibirán esta notificación:
                  </Text>

                  {assignedUsers.length === 0 ? (
                    <Text variant="bodySmall" style={styles.emptyText}>
                      Ningún usuario seleccionado. Se notificará a todos los
                      usuarios con permisos.
                    </Text>
                  ) : (
                    <View style={styles.chipsContainer}>
                      {assignedUsers.map((userId) => (
                        <Chip
                          key={userId}
                          onClose={() => removeUser(type.key, userId)}
                          style={styles.userChip}
                          textStyle={{ fontSize: 13 }}
                        >
                          {getUserName(userId)}
                        </Chip>
                      ))}
                    </View>
                  )}

                  {/* Add User Select */}
                  <View style={{ marginTop: 12 }}>
                    <AppSelect
                      placeholder="Selecciona un usuario"
                      data={getAvailableUsers(type.key)}
                      value={[]}
                      onChange={(value) => {
                        if (value) {
                          updateNotificationUsers(type.key, [
                            ...assignedUsers,
                            value as number,
                          ]);
                        }
                      }}
                    />
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoCard: {
    margin: 16,
    backgroundColor: palette.blue + "10",
    elevation: 0,
    shadowColor: "transparent",
  },
  infoText: {
    color: palette.text,
    lineHeight: 18,
  },
  card: {
    margin: 16,
    marginTop: 0,
    backgroundColor: palette.surface,
    shadowColor: "transparent",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationTitle: {
    fontWeight: "600",
    color: palette.text,
  },
  description: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  divider: {
    marginVertical: 12,
  },
  usersSection: {
    marginTop: 8,
  },
  sectionLabel: {
    color: palette.text,
    marginBottom: 8,
  },
  emptyText: {
    color: palette.textSecondary,
    fontStyle: "italic",
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userChip: {
    backgroundColor: palette.primary + "20",
  },
});
