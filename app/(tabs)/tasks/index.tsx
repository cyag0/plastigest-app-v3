import EmptyState from "@/components/App/EmptyState";
import AppListFilterBar, { type FilterConfig } from "@/components/App/AppList/AppListFilter";
import {
  ListGroup,
  ListGroupSkeleton,
  ListSection,
} from "@/components/App/ListGroup";
import ListSearchbar from "@/components/App/ListSearchbar";
import TaskDetailContent, {
  type TaskAction,
} from "@/components/Tasks/TaskDetailContent";
import TaskRow from "@/components/Tasks/TaskRow";
import {
  fetchMyOpenTasks,
  fetchMyTasks,
} from "@/components/Tasks/taskQueries";
import {
  getTaskErrorMessage,
  getTaskPermissions,
  getTaskPriorityConfig,
  getTaskStatusConfig,
  getTaskTypeConfig,
  getTaskUser,
  isTaskOverdue,
  mergeUpdatedTask,
  TASK_ACTION_MESSAGES,
  type TaskPriorityFilter,
  taskPriorityOptions,
  type TaskStatusFilter,
  taskStatusOptions,
  type TaskTypeFilter,
  taskTypeOptions,
} from "@/components/Tasks/taskPresentation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import services from "@/utils/services";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { ActivityIndicator, IconButton, Modal, Portal } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Filtros con el mismo aspecto que los listados ("Estado: Por hacer •").
// Prioridad y tipo usan "all" (no "") para que se lea "Todas"/"Todos".
const FILTERS: FilterConfig[] = [
  { type: "simple", name: "status", label: "Estado", options: taskStatusOptions },
  { type: "simple", name: "priority", label: "Prioridad", options: taskPriorityOptions },
  { type: "simple", name: "type", label: "Tipo", options: taskTypeOptions },
];

// Filtros que se resuelven con su propia consulta al backend; el resto
// ("Por hacer", "Pendientes", "En proceso", "Vencidas") sale de las tareas
// abiertas.
const SERVER_FILTERS: Partial<
  Record<TaskStatusFilter, Record<string, string>>
> = {
  completed: { status: "completed", sort_by: "completed_at", sort_order: "desc" },
  cancelled: { status: "cancelled", sort_by: "updated_at", sort_order: "desc" },
  all: { sort_by: "created_at", sort_order: "desc" },
};

type TaskSection = { key: string; title?: string; data: App.Entities.Task[] };

export default function TasksScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { hasPermission, user, location } = useAuth();
  const { colors } = useTheme();
  const hasTasksUpdate = hasPermission("tasks_update");
  const permissionsFor = (task: App.Entities.Task) =>
    getTaskPermissions(task, user?.id, hasTasksUpdate);
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;
  const wide = width >= 768;

  const [openTasks, setOpenTasks] = useState<App.Entities.Task[]>([]);
  const [serverTasks, setServerTasks] = useState<App.Entities.Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("open");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>("all");
  const [selectedTask, setSelectedTask] = useState<App.Entities.Task | null>(null);
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [pending, setPending] = useState<{
    taskId: number;
    action: TaskAction;
  } | null>(null);

  const serverFilter = SERVER_FILTERS[statusFilter];

  const loadTasks = useCallback(async () => {
    try {
      // Las vistas "por hacer" salen siempre de todas las tareas abiertas
      // del usuario (antes, con "Todas" se veían las 100 más antiguas, casi
      // todas cerradas).
      const [open, server] = await Promise.all([
        fetchMyOpenTasks({ includeOverdue: true }),
        serverFilter ? fetchMyTasks(serverFilter) : Promise.resolve(null),
      ]);
      setOpenTasks(open.items);
      setServerTasks(server?.items ?? []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      alerts.error(getTaskErrorMessage(error, "No se pudieron cargar las tareas"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alerts, serverFilter]);

  // Recarga al volver del detalle: una tarea completada allá no debe seguir
  // apareciendo como pendiente aquí.
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [loadTasks]),
  );

  const tasks = useMemo(() => {
    switch (statusFilter) {
      case "open":
        return openTasks;
      case "pending":
      case "in_progress":
        return openTasks.filter((task) => task.status === statusFilter);
      case "overdue":
        return openTasks.filter((task) => isTaskOverdue(task));
      default:
        return serverTasks;
    }
  }, [openTasks, serverTasks, statusFilter]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }
      if (typeFilter !== "all" && task.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = [
        task.title,
        task.description,
        getTaskStatusConfig(task.status).label,
        getTaskPriorityConfig(task.priority).label,
        getTaskTypeConfig(task.type).label,
        task.location?.name,
        getTaskUser(task, "assigned_by")?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tasks, search, priorityFilter, typeFilter]);

  // "Por hacer" se separa por urgencia: las vencidas primero (siguen
  // pendientes o en proceso, pero ya pasó su fecha), luego las que ya
  // se empezaron y al final las pendientes. Los totales de cada grupo
  // reemplazan a los indicadores que antes iban arriba.
  const sections = useMemo<TaskSection[]>(() => {
    if (filteredTasks.length === 0) return [];
    if (statusFilter !== "open") return [{ key: statusFilter, data: filteredTasks }];
    const overdue = filteredTasks.filter((task) => isTaskOverdue(task));
    const rest = filteredTasks.filter((task) => !isTaskOverdue(task));
    return [
      { key: "overdue", title: "Vencidas", data: overdue },
      {
        key: "in_progress",
        title: "En proceso",
        data: rest.filter((task) => task.status === "in_progress"),
      },
      {
        key: "pending",
        title: "Pendientes",
        data: rest.filter((task) => task.status !== "in_progress"),
      },
    ].filter((section) => section.data.length > 0);
  }, [filteredTasks, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const loadTaskDetail = async (taskId: number) => {
    try {
      setSelectedTaskLoading(true);
      const response = await services.tasks.show(taskId);
      const raw = response.data as any;
      const data = raw?.data ?? raw;
      setSelectedTask(data as App.Entities.Task);
    } catch (error) {
      console.error("Error loading task detail:", error);
      alerts.error(getTaskErrorMessage(error, "No se pudo abrir la tarea"));
    } finally {
      setSelectedTaskLoading(false);
    }
  };

  const handleOpenTask = (task: App.Entities.Task) => {
    if (isDesktop) {
      setSelectedTask(task);
      setDetailVisible(true);
      loadTaskDetail(task.id);
      return;
    }
    router.push({
      pathname: "/(tabs)/tasks/[id]",
      params: { id: String(task.id) },
    } as any);
  };

  const handleTaskAction = async (
    task: App.Entities.Task,
    action: TaskAction,
  ) => {
    if (pending) return;
    if (action === "cancel") {
      const confirmed = await alerts.confirm(
        "La tarea quedará cancelada y ya no se podrá completar.",
        { title: "¿Cancelar la tarea?", okText: "Cancelar tarea", cancelText: "Volver" },
      );
      if (!confirmed) return;
    }

    try {
      setPending({ taskId: task.id, action });
      const response = await services.tasks.changeStatus(task.id, action);
      const updatedTask = response?.task || response?.data;
      setSelectedTask((current) =>
        current?.id === task.id ? mergeUpdatedTask(current, updatedTask) : current,
      );
      alerts.success(TASK_ACTION_MESSAGES[action].success);
    } catch (error) {
      console.error("Error changing task status:", error);
      alerts.error(getTaskErrorMessage(error, TASK_ACTION_MESSAGES[action].error));
      if (selectedTask?.id === task.id) await loadTaskDetail(task.id);
    } finally {
      setPending(null);
      // La lista se recalcula con el estado real.
      await loadTasks();
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!selectedTask) return false;
    try {
      await services.tasks.addComment(selectedTask.id, comment);
      await loadTaskDetail(selectedTask.id);
      alerts.success("Comentario agregado");
      return true;
    } catch (error) {
      console.error("Error adding task comment:", error);
      alerts.error(getTaskErrorMessage(error, "No se pudo agregar el comentario"));
      return false;
    }
  };

  const openRelatedRoute = (route: string) => {
    setDetailVisible(false);
    router.push(route as any);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("open");
    setPriorityFilter("all");
    setTypeFilter("all");
  };

  const hasActiveFilters =
    !!search.trim() ||
    statusFilter !== "open" ||
    priorityFilter !== "all" ||
    typeFilter !== "all";

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    contentWide: { padding: 28, maxWidth: 880, width: "100%", alignSelf: "center" },
    // AppListFilterBar trae su propio margen lateral de 16 (el de AppList).
    filters: { marginTop: 8, marginLeft: -16, marginRight: -16 },
    sections: { gap: 22, marginTop: 8 },

    modalCard: {
      alignSelf: "center",
      width: "100%",
      maxWidth: 720,
      backgroundColor: c.background,
      borderRadius: 12,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: 20,
      paddingRight: 8,
      paddingVertical: 6,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    modalTitle: { fontSize: 15, fontWeight: "600", color: c.text },
    modalBody: { flex: 1, overflow: "hidden" },
    modalLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  }));

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <ListSearchbar
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar tareas..."
        />
        <View style={styles.filters}>
          <AppListFilterBar
            filters={FILTERS}
            values={{ status: statusFilter, priority: priorityFilter, type: typeFilter }}
            onChange={(values) => {
              // "Limpiar" en el filtro deja "": se vuelve al valor por omisión.
              setStatusFilter((values.status || "open") as TaskStatusFilter);
              setPriorityFilter((values.priority || "all") as TaskPriorityFilter);
              setTypeFilter((values.type || "all") as TaskTypeFilter);
            }}
          />
        </View>

        <View style={styles.sections}>
          {loading ? (
            <ListGroupSkeleton rows={3} />
          ) : sections.length === 0 ? (
            <EmptyState
              icon={hasActiveFilters ? "clipboard-search-outline" : "check-circle-outline"}
              title={
                hasActiveFilters
                  ? "No hay tareas con estos filtros"
                  : "No tienes tareas por hacer"
              }
              description={
                hasActiveFilters
                  ? "Cambia la búsqueda o los filtros para ver más."
                  : "Aquí aparecerán las tareas que te asignen."
              }
              actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          ) : (
            sections.map((section) => (
              <ListSection
                key={section.key}
                title={section.title}
                count={section.title ? section.data.length : undefined}
              >
                <ListGroup>
                  {section.data.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      currentLocationId={location?.id}
                      onPress={() => handleOpenTask(task)}
                    />
                  ))}
                </ListGroup>
              </ListSection>
            ))
          )}
        </View>
      </ScrollView>

      {/* Detalle en escritorio: se abre sobre la lista. */}
      {isDesktop && (
        <Portal>
          <Modal
            visible={detailVisible && !!selectedTask}
            onDismiss={() => setDetailVisible(false)}
            contentContainerStyle={[
              styles.modalCard,
              // Alto fijo (no solo maxHeight): el detalle usa flex:1 para su
              // scroll y su barra de acciones; sin alto definido la barra
              // (Iniciar/Completar) quedaba recortada fuera del modal.
              { height: Math.min(height - 80, 760) },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tarea</Text>
              <IconButton
                icon="close"
                size={20}
                iconColor={colors.textSecondary}
                onPress={() => setDetailVisible(false)}
                accessibilityLabel="Cerrar"
              />
            </View>
            <View style={styles.modalBody}>
              {selectedTaskLoading || !selectedTask ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <TaskDetailContent
                  task={selectedTask}
                  onChangeStatus={(action) => handleTaskAction(selectedTask, action)}
                  onAddComment={handleAddComment}
                  onOpenRoute={openRelatedRoute}
                  canAct={permissionsFor(selectedTask).canAct}
                  canCancel={permissionsFor(selectedTask).canCancel}
                  pendingAction={
                    pending?.taskId === selectedTask.id ? pending.action : null
                  }
                />
              )}
            </View>
          </Modal>
        </Portal>
      )}
    </SafeAreaView>
  );
}
