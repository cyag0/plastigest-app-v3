import TaskDetailContent from "@/components/Tasks/TaskDetailContent";
import {
  getTaskDueDateInfo,
  getTaskPriorityConfig,
  getTaskStatusConfig,
  getTaskTypeConfig,
  isTaskActionable,
  taskPriorityOptions,
  TaskPriorityFilter,
  taskStatusOptions,
  TaskStatusFilter,
  taskTypeOptions,
  TaskTypeFilter,
} from "@/components/Tasks/taskPresentation";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Modal,
  Portal,
  Searchbar,
  Text,
} from "react-native-paper";

type TaskAction = "start" | "complete" | "cancel";

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "1F" }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({
  selected,
  label,
  icon,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Chip
      compact
      mode={selected ? "flat" : "outlined"}
      icon={icon}
      selected={selected}
      onPress={onPress}
      style={[styles.filterChip, selected && styles.filterChipSelected]}
      textStyle={[styles.filterChipText, selected && styles.filterChipTextSelected]}
    >
      {label}
    </Chip>
  );
}

function TaskCard({
  task,
  onPress,
  onStart,
  onComplete,
}: {
  task: App.Entities.Task;
  onPress: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const typeConfig = getTaskTypeConfig(task.type);
  const statusConfig = getTaskStatusConfig(task.status);
  const priorityConfig = getTaskPriorityConfig(task.priority);
  const dueDateInfo = getTaskDueDateInfo(task);
  const canStart = task.status === "pending";
  const canComplete = isTaskActionable(task);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.taskPressable, pressed && styles.taskPressed]}>
      <Card style={[styles.taskCard, task.is_overdue && styles.taskCardOverdue]} mode="elevated">
        <Card.Content style={styles.taskCardContent}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.softBg }]}>
            <MaterialCommunityIcons name={typeConfig.icon as any} size={24} color={typeConfig.color} />
          </View>

          <View style={styles.taskMain}>
            <View style={styles.taskTopLine}>
              <View style={styles.taskTitleBlock}>
                <Text variant="titleMedium" style={styles.taskTitle} numberOfLines={2}>
                  {task.title}
                </Text>
                <Text style={styles.taskMeta} numberOfLines={1}>
                  {typeConfig.label} · {task.location?.name || "Sucursal actual"}
                </Text>
              </View>
              <IconButton icon="chevron-right" size={22} iconColor={palette.textSecondary} style={styles.chevron} />
            </View>

            {task.description && (
              <Text style={styles.taskDescription} numberOfLines={2}>
                {task.description}
              </Text>
            )}

            <View style={styles.taskChipsRow}>
              <Chip
                compact
                mode="flat"
                icon={statusConfig.icon}
                style={[styles.taskChip, { backgroundColor: statusConfig.softBg }]}
                textStyle={[styles.taskChipText, { color: statusConfig.color }]}
              >
                {statusConfig.label}
              </Chip>
              <Chip
                compact
                mode="flat"
                icon={priorityConfig.icon}
                style={[styles.taskChip, { backgroundColor: priorityConfig.softBg }]}
                textStyle={[styles.taskChipText, { color: priorityConfig.color }]}
              >
                {priorityConfig.label}
              </Chip>
              {dueDateInfo && (
                <Chip
                  compact
                  mode="flat"
                  icon={dueDateInfo.icon}
                  style={[styles.taskChip, { backgroundColor: dueDateInfo.softBg }]}
                  textStyle={[styles.taskChipText, { color: dueDateInfo.color }]}
                >
                  {dueDateInfo.text}
                </Chip>
              )}
            </View>

            {canComplete && (
              <View style={styles.taskActions}>
                {canStart && (
                  <Button
                    mode="outlined"
                    icon="play-circle-outline"
                    onPress={onStart}
                    compact
                    style={styles.quickButton}
                    textColor={palette.blue}
                  >
                    Iniciar
                  </Button>
                )}
                <Button
                  mode="contained"
                  icon="check-circle-outline"
                  onPress={onComplete}
                  compact
                  buttonColor={palette.success}
                  style={styles.quickButton}
                >
                  Completar
                </Button>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;
  const [tasks, setTasks] = useState<App.Entities.Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>("all");
  const [selectedTask, setSelectedTask] = useState<App.Entities.Task | null>(null);
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {
        assigned_to: "me",
        sort_by: "due_date",
        sort_order: "asc",
        per_page: 100,
      };

      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      if (priorityFilter !== "all") {
        params.priority = priorityFilter;
      }

      if (typeFilter !== "all") {
        params.type = typeFilter;
      }

      const response = await services.tasks.index(params);
      const data = response.data?.data || response.data;
      setTasks(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      alerts.error("No se pudieron cargar las tareas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [alerts, priorityFilter, statusFilter, typeFilter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = tasks.filter((task) => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const statusConfig = getTaskStatusConfig(task.status);
    const priorityConfig = getTaskPriorityConfig(task.priority);
    const typeConfig = getTaskTypeConfig(task.type);
    const haystack = [
      task.title,
      task.description,
      statusConfig.label,
      priorityConfig.label,
      typeConfig.label,
      task.location?.name,
      task.assignedTo?.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  const pendingCount = tasks.filter((task) => task.status === "pending").length;
  const inProgressCount = tasks.filter((task) => task.status === "in_progress").length;
  const overdueCount = tasks.filter((task) => task.is_overdue || task.status === "overdue").length;
  const urgentCount = tasks.filter((task) => task.priority === "urgent").length;

  const handleRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const loadTaskDetail = async (taskId: number) => {
    try {
      setSelectedTaskLoading(true);
      const response = await services.tasks.show(taskId);
      const data = response.data?.data || response.data;
      setSelectedTask(data as App.Entities.Task);
    } catch (error) {
      console.error("Error loading task detail:", error);
      alerts.error("No se pudo abrir la tarea");
    } finally {
      setSelectedTaskLoading(false);
    }
  };

  const handleOpenTask = (task: App.Entities.Task) => {
    if (isDesktop) {
      setSelectedTask(task);
      loadTaskDetail(task.id);
      return;
    }

    router.push({ pathname: "/(stacks)/tasks/[id]", params: { id: String(task.id) } } as any);
  };

  const handleTaskAction = async (task: App.Entities.Task, action: TaskAction) => {
    try {
      const response = await services.tasks.changeStatus(task.id, action);
      const updatedTask = response.data?.task || response.data?.data || response.data;
      if (updatedTask?.id) {
        setTasks((currentTasks) => currentTasks.map((item) => (item.id === task.id ? { ...item, ...updatedTask } : item)));
        if (selectedTask?.id === task.id) {
          setSelectedTask({ ...selectedTask, ...updatedTask });
        }
      } else {
        await loadTasks();
        if (selectedTask?.id === task.id) {
          await loadTaskDetail(task.id);
        }
      }
      alerts.success("Tarea actualizada correctamente");
    } catch (error) {
      console.error("Error changing task status:", error);
      alerts.error("No se pudo actualizar la tarea");
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!selectedTask) {
      return;
    }

    try {
      await services.tasks.addComment(selectedTask.id, comment);
      await loadTaskDetail(selectedTask.id);
      alerts.success("Comentario agregado");
    } catch (error) {
      console.error("Error adding task comment:", error);
      alerts.error("No se pudo agregar el comentario");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[palette.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.eyebrow}>Mis tareas</Text>
            <Text variant="headlineMedium" style={styles.headerTitle}>
              Trabajo pendiente de la sucursal
            </Text>
            <Text style={styles.headerSubtitle}>
              Revisa, inicia y cierra las tareas asignadas a tu usuario.
            </Text>
          </View>
          <Button mode="contained" icon="refresh" onPress={handleRefresh} buttonColor={palette.primary} style={styles.refreshButton}>
            Actualizar
          </Button>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Pendientes" value={pendingCount} icon="clock-outline" color={palette.warning} />
          <StatCard label="En proceso" value={inProgressCount} icon="progress-clock" color={palette.blue} />
          <StatCard label="Vencidas" value={overdueCount} icon="calendar-alert" color={palette.error} />
          <StatCard label="Urgentes" value={urgentCount} icon="alert-decagram-outline" color={palette.red} />
        </View>

        <Card style={styles.filtersCard} mode="elevated">
          <Card.Content style={styles.filtersContent}>
            <Searchbar
              placeholder="Buscar por titulo, tipo, sucursal o prioridad"
              value={search}
              onChangeText={setSearch}
              style={styles.searchbar}
              inputStyle={styles.searchInput}
              iconColor={palette.textSecondary}
              placeholderTextColor={palette.textSecondary}
            />

            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Estado</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {taskStatusOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={statusFilter === option.value}
                    label={option.label}
                    icon={option.icon}
                    onPress={() => setStatusFilter(option.value)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Prioridad</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {taskPriorityOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={priorityFilter === option.value}
                    label={option.label}
                    icon={option.icon}
                    onPress={() => setPriorityFilter(option.value)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {taskTypeOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={typeFilter === option.value}
                    label={option.label}
                    icon={option.icon}
                    onPress={() => setTypeFilter(option.value)}
                  />
                ))}
              </ScrollView>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Tareas encontradas</Text>
            <Text style={styles.listSubtitle}>
              {filteredTasks.length} de {tasks.length} tareas visibles
            </Text>
          </View>
          {(search || statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all") && (
            <Button mode="text" icon="filter-remove-outline" onPress={resetFilters} textColor={palette.textSecondary}>
              Limpiar
            </Button>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text style={styles.loadingText}>Cargando tareas...</Text>
          </View>
        ) : filteredTasks.length === 0 ? (
          <Card style={styles.emptyCard} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={44} color={palette.primary} />
              <Text style={styles.emptyTitle}>No hay tareas para estos filtros</Text>
              <Text style={styles.emptyText}>Ajusta la busqueda o cambia los filtros para ver mas resultados.</Text>
              <Button mode="outlined" icon="filter-remove-outline" onPress={resetFilters} textColor={palette.primary} style={styles.emptyButton}>
                Limpiar filtros
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.tasksList}>
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => handleOpenTask(task)}
                onStart={() => handleTaskAction(task, "start")}
                onComplete={() => handleTaskAction(task, "complete")}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={!!selectedTask && isDesktop}
          onDismiss={() => setSelectedTask(null)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedTask && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>Detalle de tarea</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedTask.title}
                  </Text>
                </View>
                <IconButton icon="close" size={21} onPress={() => setSelectedTask(null)} iconColor={palette.textSecondary} />
              </View>
              {selectedTaskLoading ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={palette.primary} />
                  <Text style={styles.loadingText}>Cargando detalle...</Text>
                </View>
              ) : (
                <TaskDetailContent
                  task={selectedTask}
                  compact
                  onBack={() => setSelectedTask(null)}
                  onChangeStatus={(action) => handleTaskAction(selectedTask, action)}
                  onAddComment={handleAddComment}
                />
              )}
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    padding: 18,
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
  },
  headerTextBlock: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  headerTitle: {
    color: palette.text,
    fontWeight: "900",
    lineHeight: 34,
  },
  headerSubtitle: {
    color: palette.textSecondary,
    lineHeight: 20,
    maxWidth: 620,
  },
  refreshButton: {
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: 145,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
    gap: 7,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: palette.text,
    fontSize: 25,
    fontWeight: "900",
  },
  statLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  filtersCard: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
  },
  filtersContent: {
    gap: 14,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  searchInput: {
    color: palette.text,
    fontSize: 14,
  },
  filterSection: {
    gap: 8,
  },
  filterTitle: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  filterRow: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderRadius: 8,
    borderColor: palette.border,
    backgroundColor: "transparent",
  },
  filterChipSelected: {
    backgroundColor: palette.primary,
  },
  filterChipText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  filterChipTextSelected: {
    color: "#fff",
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  listTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "900",
  },
  listSubtitle: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  tasksList: {
    gap: 12,
  },
  taskPressable: {
    borderRadius: 8,
  },
  taskPressed: {
    opacity: 0.86,
  },
  taskCard: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
  },
  taskCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
  },
  taskCardContent: {
    flexDirection: "row",
    gap: 13,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  taskMain: {
    flex: 1,
    gap: 10,
  },
  taskTopLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  taskTitleBlock: {
    flex: 1,
    gap: 3,
  },
  taskTitle: {
    color: palette.text,
    fontWeight: "900",
    lineHeight: 22,
  },
  taskMeta: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  chevron: {
    margin: 0,
  },
  taskDescription: {
    color: palette.textSecondary,
    lineHeight: 20,
  },
  taskChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  taskChip: {
    borderRadius: 8,
  },
  taskChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  quickButton: {
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },
  loadingText: {
    color: palette.textSecondary,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
  },
  emptyContent: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 30,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
    maxWidth: 360,
  },
  emptyButton: {
    marginTop: 6,
    borderRadius: 8,
    borderColor: palette.primary,
  },
  modalContainer: {
    width: "min(880px, 92vw)" as any,
    maxHeight: "88vh" as any,
    alignSelf: "center",
  },
  modalContent: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 620,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8F5EF",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  modalEyebrow: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modalTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    maxWidth: 680,
  },
  modalLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
