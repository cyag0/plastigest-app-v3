import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, Divider, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type EventType = App.Entities.NotificationEventType;
type TaskType = App.Entities.TaskType;

type GuideUser = App.Entities.NotificationEligibleUser & {
  open_tasks_count?: number;
};

type UsersByKey = Record<string, GuideUser[]>;

const notificationFlows: {
  event: EventType;
  title: string;
  trigger: string;
  recipients: string;
  icon: string;
  color: string;
}[] = [
  {
    event: "low_stock",
    title: "Stock bajo",
    trigger: "Cuando un conteo o movimiento deja productos por debajo del minimo.",
    recipients: "Usuarios operativos de inventario y compras segun preferencias activas.",
    icon: "package-variant-remove",
    color: palette.error,
  },
  {
    event: "inventory_count_discrepancy",
    title: "Diferencias de inventario",
    trigger: "Cuando un conteo encuentra cantidades distintas al stock esperado.",
    recipients: "Responsables del conteo y usuarios con acceso al modulo de inventario.",
    icon: "clipboard-alert-outline",
    color: palette.warning,
  },
  {
    event: "purchase_update",
    title: "Actualizacion de compra",
    trigger: "Cuando una compra pasa a transito o queda recibida.",
    recipients: "Usuarios del flujo de compras y usuarios relacionados con la sucursal.",
    icon: "truck-delivery-outline",
    color: palette.primary,
  },
  {
    event: "task_event",
    title: "Evento de tarea",
    trigger: "Cuando una tarea se asigna, completa, comenta o vence.",
    recipients: "Usuario asignado, quien la creo o usuarios directamente involucrados.",
    icon: "checkbox-marked-circle-outline",
    color: palette.blue,
  },
];

const taskFlows: {
  title: string;
  type: TaskType;
  trigger: string;
  owner: string;
  icon: string;
}[] = [
  {
    title: "Recibir compra",
    type: "receive_purchase",
    trigger: "Compra V2 marcada como en transito.",
    owner: "Sucursal de la compra; se asigna automaticamente con la regla simple actual.",
    icon: "package-down",
  },
  {
    title: "Revisar faltantes de compra",
    type: "stock_check",
    trigger: "Compra recibida con menos cantidad que la solicitada.",
    owner: "Responsable operativo de la sucursal donde se recibio la compra.",
    icon: "magnify",
  },
  {
    title: "Aprobar transferencia",
    type: "approve_transfer",
    trigger: "Transferencia creada en estado pendiente.",
    owner: "Sucursal origen; el modulo sigue usando los permisos actuales de transferencias.",
    icon: "check-decagram-outline",
  },
  {
    title: "Enviar transferencia",
    type: "send_transfer",
    trigger: "Transferencia aprobada.",
    owner: "Sucursal origen para preparar y registrar lo enviado.",
    icon: "truck-delivery-outline",
  },
  {
    title: "Recibir transferencia",
    type: "receive_transfer",
    trigger: "Transferencia enviada y en transito.",
    owner: "Sucursal destino para confirmar recibido, faltante o danado.",
    icon: "package-variant-closed-check",
  },
  {
    title: "Revisar diferencias de transferencia",
    type: "stock_check",
    trigger: "Recepcion con faltantes, dano o evidencia de diferencia.",
    owner: "Sucursal destino para corregir e investigar la diferencia.",
    icon: "clipboard-search-outline",
  },
  {
    title: "Conteo de inventario",
    type: "inventory_count",
    trigger: "Tarea recurrente o conteo planificado por sucursal.",
    owner: "Usuario asignado para hacer el conteo semanal, diario o mensual.",
    icon: "clipboard-list-outline",
  },
  {
    title: "Reporte de ventas",
    type: "sales_report",
    trigger: "Tarea recurrente configurada para cierre o revision comercial.",
    owner: "Responsable de ventas o gerencia.",
    icon: "chart-line",
  },
];

const lifecycleSteps = [
  "El sistema detecta un cambio operativo: compra, transferencia, conteo, ajuste o reporte.",
  "Se crea una tarea con tipo, prioridad, sucursal, vencimiento y relacion al registro original.",
  "La tarea se asigna con la regla simple actual: sucursal y carga de tareas del usuario.",
  "Al asignarse, completarse, comentarse o vencerse, se genera una notificacion interna.",
  "El usuario puede abrir la tarea, iniciarla, completarla o revisar el registro relacionado.",
];

function normalizeUsers(response: any): GuideUser[] {
  const payload = response?.data?.data ?? response?.data ?? response;

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((user) => user?.id)
    .map((user) => ({
      id: user.id,
      name: user.name ?? "Usuario",
      email: user.email ?? "",
      open_tasks_count: user.open_tasks_count,
    }));
}

function InfoRow({
  icon,
  title,
  body,
  color = palette.primary,
}: {
  icon: string;
  title: string;
  body: string;
  color?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.iconBubble, { backgroundColor: color + "22" }]}>
        <MaterialCommunityIcons name={icon as any} size={22} color={color} />
      </View>
      <View style={styles.infoText}>
        <Text variant="titleSmall" style={styles.rowTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" style={styles.rowBody}>
          {body}
        </Text>
      </View>
    </View>
  );
}

function UsersBlock({
  users,
  loading,
  branchReady,
  emptyText,
  showTaskLoad = false,
}: {
  users: GuideUser[];
  loading: boolean;
  branchReady: boolean;
  emptyText: string;
  showTaskLoad?: boolean;
}) {
  if (!branchReady) {
    return (
      <View style={styles.usersEmptyRow}>
        <MaterialCommunityIcons
          name="map-marker-alert-outline"
          size={17}
          color={palette.warning}
        />
        <Text variant="bodySmall" style={styles.usersEmptyText}>
          Selecciona una sucursal para ver usuarios.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.usersEmptyRow}>
        <ActivityIndicator size="small" color={palette.primary} />
        <Text variant="bodySmall" style={styles.usersEmptyText}>
          Cargando usuarios de la sucursal...
        </Text>
      </View>
    );
  }

  if (users.length === 0) {
    return (
      <View style={styles.usersEmptyRow}>
        <MaterialCommunityIcons
          name="account-off-outline"
          size={17}
          color={palette.textSecondary}
        />
        <Text variant="bodySmall" style={styles.usersEmptyText}>
          {emptyText}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.usersList}>
      {users.map((user) => (
        <View key={user.id} style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userText}>
            <Text variant="bodySmall" style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text variant="bodySmall" style={styles.userEmail} numberOfLines={1}>
              {user.email || "Sin correo"}
            </Text>
          </View>
          {showTaskLoad && (
            <Chip compact mode="flat" style={styles.taskCountChip}>
              {user.open_tasks_count ?? 0} abiertas
            </Chip>
          )}
        </View>
      ))}
    </View>
  );
}

export default function TaskNotificationGuideScreen() {
  const alerts = useAlerts();
  const router = useRouter();
  const {
    user,
    selectedCompany,
    hasPermission,
    loadUnreadNotificationsCount,
  } = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const [creatingTest, setCreatingTest] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [notificationUsers, setNotificationUsers] = useState<UsersByKey>({});
  const [taskUsers, setTaskUsers] = useState<UsersByKey>({});

  const selectedCompanyId = selectedCompany?.id;
  const selectedLocationId = selectedLocation?.id;
  const branchReady = Boolean(selectedCompanyId && selectedLocationId);

  const canCreateTestTask = Boolean(user?.id && branchReady && hasPermission("tasks_create"));

  useEffect(() => {
    let cancelled = false;

    async function loadUsersByFlow() {
      if (!selectedCompanyId || !selectedLocationId) {
        setNotificationUsers({});
        setTaskUsers({});
        setUsersError(null);
        setLoadingUsers(false);
        return;
      }

      try {
        setLoadingUsers(true);
        setUsersError(null);

        const prefsResponse = await services.notificationPreferences.index();
        const prefsList: App.Entities.NotificationPreference[] =
          prefsResponse?.data ?? prefsResponse ?? [];
        const prefsMap = prefsList.reduce<Partial<Record<EventType, App.Entities.NotificationPreference>>>(
          (acc, pref) => ({ ...acc, [pref.event_type]: pref }),
          {},
        );

        const notificationEntries = await Promise.all(
          notificationFlows.map(async (flow) => {
            const response = await services.notificationPreferences.eligibleUsers(flow.event, {
              location_id: selectedLocationId,
            });
            const pref = prefsMap[flow.event];
            let usersForEvent = normalizeUsers(response);

            if (pref?.is_active === false) {
              usersForEvent = [];
            } else if (Array.isArray(pref?.allowed_user_ids)) {
              usersForEvent = usersForEvent.filter((item) =>
                pref.allowed_user_ids?.includes(item.id),
              );
            }

            return [flow.event, usersForEvent] as const;
          }),
        );

        const taskTypes = Array.from(new Set(taskFlows.map((flow) => flow.type)));
        const taskEntries = await Promise.all(
          taskTypes.map(async (type) => {
            const response = await services.tasks.eligibleUsers({
              location_id: selectedLocationId,
              type,
            });

            return [type, normalizeUsers(response)] as const;
          }),
        );

        if (cancelled) {
          return;
        }

        setNotificationUsers(Object.fromEntries(notificationEntries));
        setTaskUsers(Object.fromEntries(taskEntries));
      } catch {
        if (!cancelled) {
          setUsersError("No se pudieron cargar los usuarios de esta sucursal.");
          setNotificationUsers({});
          setTaskUsers({});
        }
      } finally {
        if (!cancelled) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsersByFlow();

    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId, selectedLocationId]);

  const handleCreateTestTask = async () => {
    if (!user?.id || !selectedCompany) {
      alerts.error("Selecciona empresa e inicia sesion antes de probar.");
      return;
    }

    if (!selectedLocationId) {
      alerts.error("Selecciona sucursal antes de probar.");
      return;
    }

    if (!hasPermission("tasks_create")) {
      alerts.error("Tu usuario necesita el permiso tasks_create para crear la prueba.");
      return;
    }

    try {
      setCreatingTest(true);
      const dueDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const response = await services.tasks.store({
        title: "Prueba de tareas y notificaciones",
        description:
          "Tarea creada desde la guia para validar asignacion, listado y notificacion interna.",
        type: "custom",
        priority: "medium",
        assigned_to: user.id,
        location_id: selectedLocationId,
        due_date: dueDate,
        metadata: {
          source: "task_notification_guide",
          test: true,
        },
      });

      await loadUnreadNotificationsCount();

      const createdTask = (response.data as any)?.data ?? response.data;
      const taskId = createdTask?.id;

      alerts.success("Prueba creada. Revisa Tareas y la campana de notificaciones.");

      if (taskId) {
        router.push(`/(tabs)/tasks/${taskId}` as any);
      }
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message ||
          "No se pudo crear la tarea de prueba",
      );
    } finally {
      setCreatingTest(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons
              name="bell-check-outline"
              size={34}
              color="#fff"
            />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" style={styles.heroTitle}>
              Tareas y notificaciones
            </Text>
            <Text variant="bodyMedium" style={styles.heroText}>
              Guia operativa para saber que se genera, cuando se activa y que
              usuarios de la sucursal actual reciben cada aviso.
            </Text>
          </View>
        </View>

        <View style={branchReady ? styles.locationNotice : styles.locationWarning}>
          <MaterialCommunityIcons
            name={branchReady ? "map-marker-check-outline" : "map-marker-alert-outline"}
            size={18}
            color={branchReady ? palette.primary : palette.warning}
          />
          <Text variant="bodySmall" style={styles.locationNoticeText}>
            {branchReady
              ? `Mostrando usuarios de ${selectedLocation?.name}`
              : "Selecciona una sucursal para ver usuarios por notificacion y tarea."}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Button
            mode="contained"
            icon="flask-outline"
            loading={creatingTest}
            disabled={creatingTest || !canCreateTestTask}
            onPress={handleCreateTestTask}
            style={styles.primaryAction}
            contentStyle={styles.actionContent}
          >
            Crear prueba
          </Button>
          <Button
            mode="outlined"
            icon="checkbox-marked-outline"
            onPress={() => router.push("/(tabs)/tasks" as any)}
            style={styles.secondaryAction}
            contentStyle={styles.actionContent}
          >
            Ver tareas
          </Button>
          <Button
            mode="outlined"
            icon="bell-outline"
            onPress={() => router.push("/(tabs)/notifications" as any)}
            style={styles.secondaryAction}
            contentStyle={styles.actionContent}
          >
            Ver avisos
          </Button>
        </View>

        {!canCreateTestTask && (
          <View style={styles.permissionNotice}>
            <MaterialCommunityIcons
              name="lock-alert-outline"
              size={18}
              color={palette.error}
            />
            <Text variant="bodySmall" style={styles.permissionText}>
              El boton de prueba requiere empresa, sucursal y permiso tasks_create.
            </Text>
          </View>
        )}

        {usersError && (
          <View style={styles.permissionNotice}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={18}
              color={palette.error}
            />
            <Text variant="bodySmall" style={styles.permissionText}>
              {usersError}
            </Text>
          </View>
        )}

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="timeline-check-outline"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Como fluye una tarea
              </Text>
            </View>
            <View style={styles.stepList}>
              {lifecycleSteps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.stepText}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="bell-ring-outline"
                size={24}
                color={palette.blue}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notificaciones activas
              </Text>
            </View>
            {notificationFlows.map((item, index) => (
              <View key={item.event}>
                <InfoRow
                  icon={item.icon}
                  title={item.title}
                  body={`${item.trigger} Llega a: ${item.recipients}`}
                  color={item.color}
                />
                <View style={styles.chipLine}>
                  <Chip compact mode="flat" style={styles.typeChip}>
                    {item.event}
                  </Chip>
                </View>
                <View style={styles.usersBlock}>
                  <Text variant="labelSmall" style={styles.usersTitle}>
                    Usuarios suscritos en esta sucursal
                  </Text>
                  <UsersBlock
                    users={notificationUsers[item.event] ?? []}
                    loading={loadingUsers}
                    branchReady={branchReady}
                    emptyText="Sin usuarios suscritos para esta sucursal."
                  />
                </View>
                {index < notificationFlows.length - 1 && (
                  <Divider style={styles.divider} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="clipboard-check-multiple-outline"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Tareas que genera el sistema
              </Text>
            </View>
            {taskFlows.map((item, index) => (
              <View key={`${item.type}-${item.title}`}>
                <InfoRow
                  icon={item.icon}
                  title={item.title}
                  body={`${item.trigger} Responsable: ${item.owner}`}
                  color={index % 2 === 0 ? palette.primary : palette.blue}
                />
                <View style={styles.chipLine}>
                  <Chip compact mode="flat" style={styles.typeChip}>
                    {item.type}
                  </Chip>
                </View>
                <View style={styles.usersBlock}>
                  <Text variant="labelSmall" style={styles.usersTitle}>
                    Usuarios asignables en esta sucursal
                  </Text>
                  <UsersBlock
                    users={taskUsers[item.type] ?? []}
                    loading={loadingUsers}
                    branchReady={branchReady}
                    emptyText="Sin usuarios activos para asignar en esta sucursal."
                    showTaskLoad
                  />
                </View>
                {index < taskFlows.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))}
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="account-filter-outline"
                size={24}
                color={palette.warning}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Permisos y alcance
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.paragraph}>
              Por ahora la regla se mantiene simple: las pantallas de cada modulo siguen
              protegidas con los permisos actuales, como transfers_update,
              purchases_update, inventory_manage y tasks_list. La asignacion automatica
              no agrega permisos nuevos; usa la sucursal de la tarea y la carga de trabajo
              de usuarios activos.
            </Text>
            <Text variant="bodyMedium" style={styles.paragraph}>
              Las notificaciones informan cambios; las tareas son trabajo accionable. Si
              una tarea se asigna a un usuario, ese usuario vera el registro en Tareas y
              recibira un aviso tipo task_event.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
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
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 8,
    backgroundColor: palette.primary,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "700",
  },
  heroText: {
    color: "#fff",
    opacity: 0.9,
    lineHeight: 20,
  },
  locationNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: palette.primary + "14",
  },
  locationWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: palette.warning + "18",
  },
  locationNoticeText: {
    flex: 1,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  primaryAction: {
    borderRadius: 8,
    backgroundColor: palette.textSecondary,
  },
  secondaryAction: {
    borderRadius: 8,
    borderColor: palette.textSecondary,
  },
  actionContent: {
    minHeight: 44,
  },
  permissionNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: palette.error + "14",
  },
  permissionText: {
    color: palette.error,
    flex: 1,
  },
  card: {
    borderRadius: 8,
    backgroundColor: palette.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontWeight: "700",
    color: palette.text,
  },
  stepList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  stepNumber: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  stepText: {
    flex: 1,
    color: palette.text,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
  },
  rowTitle: {
    fontWeight: "700",
    color: palette.text,
    marginBottom: 3,
  },
  rowBody: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  chipLine: {
    flexDirection: "row",
    marginTop: 8,
    marginLeft: 54,
  },
  typeChip: {
    backgroundColor: palette.surface,
  },
  usersBlock: {
    marginTop: 10,
    marginLeft: 54,
    gap: 8,
  },
  usersTitle: {
    color: palette.textSecondary,
    fontWeight: "700",
    letterSpacing: 0,
  },
  usersList: {
    gap: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 9,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary + "20",
  },
  userAvatarText: {
    color: palette.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: palette.text,
    fontWeight: "700",
  },
  userEmail: {
    color: palette.textSecondary,
    fontSize: 11,
  },
  taskCountChip: {
    backgroundColor: palette.primary + "18",
  },
  usersEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  usersEmptyText: {
    flex: 1,
    color: palette.textSecondary,
    lineHeight: 18,
  },
  divider: {
    marginVertical: 14,
    backgroundColor: palette.border,
  },
  paragraph: {
    color: palette.textSecondary,
    lineHeight: 21,
    marginBottom: 10,
  },
});