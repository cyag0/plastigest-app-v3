import AppChip from "@/components/App/Chip";
import EmptyState from "@/components/App/EmptyState";
import SectionHeader from "@/components/App/SectionHeader";
import KpiCard from "@/components/Dashboard/KpiCard";
import TaskDetailContent from "@/components/Tasks/TaskDetailContent";
import {
  getTaskDueDateInfo,
  getTaskPriorityConfig,
  getTaskStatusConfig,
  getTaskTypeConfig,
  isTaskActionable,
  TaskPriorityFilter,
  taskPriorityOptions,
  TaskStatusFilter,
  taskStatusOptions,
  TaskTypeFilter,
  taskTypeOptions,
} from "@/components/Tasks/taskPresentation";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAlerts } from "@/hooks/useAlerts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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

type TaskAction = "start" | "complete" | "cancel";

function FilterChip({
  selected,
  label,
  icon,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.filterChip,
        selected && {
          backgroundColor: palette.primarySoft,
          borderColor: palette.primary,
        },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={13}
        color={selected ? palette.primary : palette.textSecondary}
      />
      <Text
        style={[
          styles.filterChipText,
          selected && { color: palette.primary, fontWeight: "600" },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TaskRow({
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
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.taskRow,
        task.is_overdue && {
          borderLeftWidth: 3,
          borderLeftColor: palette.error,
        },
      ]}
    >
      <View
        style={[styles.taskTypeIcon, { backgroundColor: typeConfig.softBg }]}
      >
        <MaterialCommunityIcons
          name={typeConfig.icon as any}
          size={20}
          color={typeConfig.color}
        />
      </View>

      <View style={styles.taskBody}>
        <View style={styles.taskHeaderLine}>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {task.title}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={palette.textMuted}
          />
        </View>
        <Text style={styles.taskMeta} numberOfLines={1}>
          {typeConfig.label} · {task.location?.name || "Sucursal actual"}
        </Text>
        {task.description && (
          <Text style={styles.taskDescription} numberOfLines={1}>
            {task.description}
          </Text>
        )}
        <View style={styles.taskChipsRow}>
          <AppChip variant="default" size="sm" icon={statusConfig.icon as any}>
            {statusConfig.label}
          </AppChip>
          <AppChip
            variant="default"
            size="sm"
            icon={priorityConfig.icon as any}
          >
            {priorityConfig.label}
          </AppChip>
          {dueDateInfo && (
            <AppChip
              variant="default"
              size="sm"
              icon={dueDateInfo.icon as any}
            >
              {dueDateInfo.text}
            </AppChip>
          )}
        </View>
        {canComplete && (
          <View style={styles.taskActions}>
            {canStart && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                activeOpacity={0.7}
                style={[styles.quickAction, styles.quickActionOutline]}
              >
                <MaterialCommunityIcons
                  name="play-circle-outline"
                  size={14}
                  color={palette.info}
                />
                <Text
                  style={[styles.quickActionText, { color: palette.info }]}
                >
                  Iniciar
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onComplete();
              }}
              activeOpacity={0.7}
              style={[styles.quickAction, styles.quickActionPrimary]}
            >
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={14}
                color={palette.textInverse}
              />
              <Text
                style={[
                  styles.quickActionText,
                  { color: palette.textInverse },
                ]}
              >
                Completar
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= 900;

  const [tasks, setTasks] = useState<App.Entities.Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<TaskTypeFilter>("all");
  const [selectedTask, setSelectedTask] = useState<App.Entities.Task | null>(
    null,
  );
  const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {
        assigned_to: "me",
        sort_by: "due_date",
        sort_order: "asc",
        per_page: 100,
      };
      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (typeFilter !== "all") params.type = typeFilter;

      const response = await services.tasks.index(params);
      const raw = response.data as any;
      const data: App.Entities.Task[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
      setTasks(data);
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

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter((task) => {
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
      return haystack.includes(q);
    });
  }, [tasks, search]);

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress")
    .length;
  const overdueCount = tasks.filter(
    (t) => t.is_overdue || t.status === "overdue",
  ).length;
  const urgentCount = tasks.filter((t) => t.priority === "urgent").length;

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
      alerts.error("No se pudo abrir la tarea");
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
    try {
      const response = await services.tasks.changeStatus(task.id, action);
      const raw = response.data as any;
      const updatedTask = raw?.task ?? raw?.data ?? raw;
      if (updatedTask?.id) {
        setTasks((current) =>
          current.map((item) =>
            item.id === task.id ? { ...item, ...updatedTask } : item,
          ),
        );
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
    if (!selectedTask) return;
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

  const hasActiveFilters =
    !!search ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    typeFilter !== "all";

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (priorityFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0);

  const statusLabel =
    statusFilter === "all"
      ? null
      : taskStatusOptions.find((o) => o.value === statusFilter)?.label;
  const priorityLabel =
    priorityFilter === "all"
      ? null
      : taskPriorityOptions.find((o) => o.value === priorityFilter)?.label;
  const typeLabel =
    typeFilter === "all"
      ? null
      : taskTypeOptions.find((o) => o.value === typeFilter)?.label;

  const resetTaskFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        {/* ============== HEADER ============== */}
        <View style={styles.headerCard}>
          <View style={styles.headerIconBox}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={22}
              color={palette.primary}
            />
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.eyebrow}>Mis tareas</Text>
            <Text style={styles.headerTitle}>Trabajo pendiente</Text>
            <Text style={styles.headerSubtitle}>
              Revisa, inicia y cierra las tareas asignadas a tu usuario.
            </Text>
          </View>
        </View>

        {/* ============== KPI ============== */}
        <View style={styles.section}>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="clock-outline"
              label="Pendientes"
              value={String(pendingCount)}
            />
            <KpiCard
              icon="progress-clock"
              label="En proceso"
              value={String(inProgressCount)}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              icon="calendar-alert"
              label="Vencidas"
              value={String(overdueCount)}
              inverseDelta={overdueCount > 0}
            />
            <KpiCard
              icon="alert-decagram-outline"
              label="Urgentes"
              value={String(urgentCount)}
              inverseDelta={urgentCount > 0}
            />
          </View>
        </View>

        {/* ============== TOOLBAR: SEARCH + FILTROS ============== */}
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons
              name="magnify"
              size={18}
              color={palette.textMuted}
            />
            <TextInput
              placeholder="Buscar tarea..."
              placeholderTextColor={palette.textMuted}
              value={search}
              onChangeText={setSearch}
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

        {/* Active filter chips */}
        {(statusLabel || priorityLabel || typeLabel) && (
          <View style={styles.activeFiltersRow}>
            {statusLabel && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStatusFilter("all")}
                style={styles.activeChip}
              >
                <Text style={styles.activeChipText}>{statusLabel}</Text>
                <MaterialCommunityIcons
                  name="close"
                  size={12}
                  color={palette.primary}
                />
              </TouchableOpacity>
            )}
            {priorityLabel && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setPriorityFilter("all")}
                style={styles.activeChip}
              >
                <Text style={styles.activeChipText}>{priorityLabel}</Text>
                <MaterialCommunityIcons
                  name="close"
                  size={12}
                  color={palette.primary}
                />
              </TouchableOpacity>
            )}
            {typeLabel && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setTypeFilter("all")}
                style={styles.activeChip}
              >
                <Text style={styles.activeChipText}>{typeLabel}</Text>
                <MaterialCommunityIcons
                  name="close"
                  size={12}
                  color={palette.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={resetTaskFilters}
              style={styles.clearAll}
            >
              <Text style={styles.clearAllText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============== LISTA ============== */}
        <View style={styles.section}>
          <SectionHeader
            title="Tareas encontradas"
            badge={`${filteredTasks.length} de ${tasks.length}`}
            actionLabel={
              hasActiveFilters && !statusLabel && !priorityLabel && !typeLabel
                ? "Limpiar"
                : undefined
            }
            onAction={
              hasActiveFilters && !statusLabel && !priorityLabel && !typeLabel
                ? resetFilters
                : undefined
            }
          />

          {loading ? (
            <View style={styles.loadingList}>
              {[0, 1, 2].map((i) => (
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
          ) : filteredTasks.length === 0 ? (
            <View style={styles.toolbarCard}>
              <EmptyState
                compact
                icon="clipboard-check-outline"
                title="No hay tareas para estos filtros"
                description="Ajusta la busqueda o cambia los filtros para ver mas resultados."
                actionLabel={
                  hasActiveFilters ? "Limpiar filtros" : undefined
                }
                onAction={hasActiveFilters ? resetFilters : undefined}
              />
            </View>
          ) : (
            <View style={styles.list}>
              {filteredTasks.map((task) => (
                <View key={task.id} style={styles.taskCardWrapper}>
                  <TaskRow
                    task={task}
                    onPress={() => handleOpenTask(task)}
                    onStart={() => handleTaskAction(task, "start")}
                    onComplete={() => handleTaskAction(task, "complete")}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ============== MODAL: FILTROS ============== */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onReset={resetTaskFilters}
      />

      {/* ============== MODAL DETAIL (desktop) ============== */}
      {isDesktop && detailVisible && selectedTask && (
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { maxHeight: Math.min(height - 80, 760) },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalEyebrow}>Detalle de tarea</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedTask.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDetailVisible(false)}
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
            <View style={styles.modalBody}>
              {selectedTaskLoading ? (
                <View style={styles.modalLoading}>
                  <MaterialCommunityIcons
                    name="loading"
                    size={28}
                    color={palette.primary}
                  />
                  <Text style={styles.modalLoadingText}>
                    Cargando detalle...
                  </Text>
                </View>
              ) : (
                <TaskDetailContent
                  task={selectedTask}
                  compact
                  onBack={() => setDetailVisible(false)}
                  onChangeStatus={(action) =>
                    handleTaskAction(selectedTask, action)
                  }
                  onAddComment={handleAddComment}
                />
              )}
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============== FILTER MODAL ==============

function FilterModal({
  visible,
  onClose,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  typeFilter,
  setTypeFilter,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  statusFilter: TaskStatusFilter;
  setStatusFilter: (v: TaskStatusFilter) => void;
  priorityFilter: TaskPriorityFilter;
  setPriorityFilter: (v: TaskPriorityFilter) => void;
  typeFilter: TaskTypeFilter;
  setTypeFilter: (v: TaskTypeFilter) => void;
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
              <Text style={styles.filterModalTitle}>Tareas</Text>
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
              <Text style={styles.filterGroupLabel}>ESTADO</Text>
              <View style={styles.filterGroupChipsWrap}>
                {taskStatusOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={statusFilter === option.value}
                    label={option.label}
                    icon={option.icon}
                    onPress={() => setStatusFilter(option.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>PRIORIDAD</Text>
              <View style={styles.filterGroupChipsWrap}>
                {taskPriorityOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={priorityFilter === option.value}
                    label={option.label}
                    icon={option.icon}
                    onPress={() => setPriorityFilter(option.value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupLabel}>TIPO</Text>
              <View style={styles.filterGroupChipsWrap}>
                {taskTypeOptions.map((option) => (
                  <FilterChip
                    key={option.value}
                    selected={typeFilter === option.value}
                    label={option.label}
                    icon={option.icon}
                    onPress={() => setTypeFilter(option.value)}
                  />
                ))}
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
  content: {
    paddingBottom: tokens.spacing[10],
  },

  // --- Header card ---
  headerCard: {
    flexDirection: "row",
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
  headerBody: {
    flex: 1,
    minWidth: 0,
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

  // --- Sections ---
  section: {
    paddingHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[5],
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

  // --- Filter modal (shared styles) ---
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

  // --- List ---
  list: {
    gap: tokens.spacing[3],
  },
  toolbarCard: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    ...tokens.shadow.sm,
  },
  taskCardWrapper: {
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    ...tokens.shadow.sm,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  taskTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  taskBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  taskHeaderLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing[2],
  },
  taskTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    flex: 1,
  },
  taskMeta: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
  },
  taskDescription: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },
  taskChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  taskActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.spacing[2],
    marginTop: tokens.spacing[2],
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: tokens.spacing[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.md,
  },
  quickActionOutline: {
    borderWidth: 1,
    borderColor: palette.info,
    backgroundColor: "transparent",
  },
  quickActionPrimary: {
    backgroundColor: palette.success,
  },
  quickActionText: {
    ...tokens.typography.caption,
    fontWeight: "600",
  },

  // --- Loading skeleton ---
  loadingList: {
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
    width: 40,
    height: 40,
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

  // --- Modal (desktop) ---
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: tokens.spacing[5],
  },
  modalCard: {
    width: "min(880px, 92vw)" as any,
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
    overflow: "hidden",
  },
  modalLoading: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing[3],
  },
  modalLoadingText: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
  },
});
