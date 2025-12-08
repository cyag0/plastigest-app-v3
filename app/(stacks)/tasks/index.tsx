import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  IconButton,
  Menu,
  Searchbar,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type TaskStatus = "all" | "pending" | "in_progress" | "completed" | "overdue";
type TaskPriority = "all" | "urgent" | "high" | "medium" | "low";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<App.Entities.Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus>("pending");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority>("all");
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const { selectedCompany } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadTasks();
  }, [selectedCompany, statusFilter, priorityFilter]);

  const loadTasks = async (isRefresh = false) => {
    if (!selectedCompany) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {
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

      if (search) {
        params.search = search;
      }

      const response = await Services.tasks.index(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await Services.tasks.update(taskId, { status: "completed" });
      loadTasks();
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  const handleStartTask = async (taskId: number) => {
    try {
      await Services.tasks.update(taskId, { status: "in_progress" });
      loadTasks();
    } catch (error) {
      console.error("Error starting task:", error);
    }
  };

  const getPriorityColor = (priority: App.Entities.TaskPriority) => {
    switch (priority) {
      case "urgent":
        return palette.error;
      case "high":
        return palette.warning;
      case "medium":
        return palette.blue;
      case "low":
        return palette.textSecondary;
      default:
        return palette.textSecondary;
    }
  };

  const getPriorityLabel = (priority: App.Entities.TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "Urgente";
      case "high":
        return "Alta";
      case "medium":
        return "Media";
      case "low":
        return "Baja";
      default:
        return priority;
    }
  };

  const getStatusColor = (status: App.Entities.TaskStatus) => {
    switch (status) {
      case "pending":
        return palette.warning;
      case "in_progress":
        return palette.blue;
      case "completed":
        return palette.success;
      case "cancelled":
        return palette.textSecondary;
      case "overdue":
        return palette.error;
      default:
        return palette.textSecondary;
    }
  };

  const getStatusLabel = (status: App.Entities.TaskStatus) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En Proceso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      case "overdue":
        return "Vencida";
      default:
        return status;
    }
  };

  const getTypeIcon = (type: App.Entities.TaskType) => {
    switch (type) {
      case "inventory_count":
        return "clipboard-list";
      case "receive_purchase":
        return "package-variant";
      case "approve_transfer":
        return "check-circle";
      case "send_transfer":
        return "truck-delivery";
      case "receive_transfer":
        return "package-down";
      case "sales_report":
        return "chart-line";
      case "stock_check":
        return "magnify";
      case "adjustment_review":
        return "clipboard-edit";
      case "custom":
        return "note";
      default:
        return "checkbox-marked-circle";
    }
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Vencida hace ${Math.abs(diffDays)} día(s)`,
        color: palette.error,
      };
    } else if (diffDays === 0) {
      return { text: "Vence hoy", color: palette.warning };
    } else if (diffDays === 1) {
      return { text: "Vence mañana", color: palette.warning };
    } else if (diffDays <= 7) {
      return { text: `Vence en ${diffDays} días`, color: palette.blue };
    }
    return { text: date.toLocaleDateString(), color: palette.textSecondary };
  };

  const renderTaskActions = (task: App.Entities.Task) => {
    if (task.status === "completed" || task.status === "cancelled") {
      return null;
    }

    return (
      <View style={styles.taskActions}>
        {task.status === "pending" && (
          <IconButton
            icon="play-circle"
            size={20}
            iconColor={palette.blue}
            onPress={() => handleStartTask(task.id)}
          />
        )}
        <IconButton
          icon="check-circle"
          size={20}
          iconColor={palette.success}
          onPress={() => handleCompleteTask(task.id)}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        {/* Search */}
        <Searchbar
          placeholder="Buscar tareas..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => loadTasks()}
          style={styles.searchbar}
        />

        {/* Filters */}
        <View style={styles.filters}>
          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <Chip
                mode="outlined"
                icon="filter"
                onPress={() => setStatusMenuVisible(true)}
                style={styles.filterChip}
              >
                {getStatusLabel(statusFilter as any) || "Estado"}
              </Chip>
            }
          >
            <Menu.Item
              onPress={() => {
                setStatusFilter("all");
                setStatusMenuVisible(false);
              }}
              title="Todos"
            />
            <Menu.Item
              onPress={() => {
                setStatusFilter("pending");
                setStatusMenuVisible(false);
              }}
              title="Pendiente"
            />
            <Menu.Item
              onPress={() => {
                setStatusFilter("in_progress");
                setStatusMenuVisible(false);
              }}
              title="En Proceso"
            />
            <Menu.Item
              onPress={() => {
                setStatusFilter("completed");
                setStatusMenuVisible(false);
              }}
              title="Completada"
            />
            <Menu.Item
              onPress={() => {
                setStatusFilter("overdue");
                setStatusMenuVisible(false);
              }}
              title="Vencida"
            />
          </Menu>

          <Menu
            visible={priorityMenuVisible}
            onDismiss={() => setPriorityMenuVisible(false)}
            anchor={
              <Chip
                mode="outlined"
                icon="alert-circle"
                onPress={() => setPriorityMenuVisible(true)}
                style={styles.filterChip}
              >
                {getPriorityLabel(priorityFilter as any) || "Prioridad"}
              </Chip>
            }
          >
            <Menu.Item
              onPress={() => {
                setPriorityFilter("all");
                setPriorityMenuVisible(false);
              }}
              title="Todas"
            />
            <Menu.Item
              onPress={() => {
                setPriorityFilter("urgent");
                setPriorityMenuVisible(false);
              }}
              title="Urgente"
            />
            <Menu.Item
              onPress={() => {
                setPriorityFilter("high");
                setPriorityMenuVisible(false);
              }}
              title="Alta"
            />
            <Menu.Item
              onPress={() => {
                setPriorityFilter("medium");
                setPriorityMenuVisible(false);
              }}
              title="Media"
            />
            <Menu.Item
              onPress={() => {
                setPriorityFilter("low");
                setPriorityMenuVisible(false);
              }}
              title="Baja"
            />
          </Menu>
        </View>
      </View>

      {/* Tasks List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTasks(true)}
              colors={[palette.primary]}
            />
          }
        >
          {tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="checkbox-marked-circle-outline"
                size={64}
                color={palette.textSecondary}
              />
              <Text variant="titleMedium" style={styles.emptyText}>
                No se encontraron tareas
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Intenta ajustar los filtros
              </Text>
            </View>
          ) : (
            tasks.map((task) => {
              const dueDateInfo = formatDueDate(task.due_date);
              const isOverdue = task.is_overdue || task.status === "overdue";

              return (
                <TouchableRipple
                  key={task.id}
                  onPress={() =>
                    router.push(`/(stacks)/tasks/${task.id}` as any)
                  }
                  style={styles.taskCard}
                >
                  <Card style={[styles.card, isOverdue && styles.overdueCard]}>
                    <Card.Content style={styles.cardContent}>
                      <View style={styles.taskHeader}>
                        <View
                          style={[
                            styles.iconContainer,
                            {
                              backgroundColor:
                                getPriorityColor(task.priority) + "20",
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={getTypeIcon(task.type) as any}
                            size={24}
                            color={getPriorityColor(task.priority)}
                          />
                        </View>
                        <View style={styles.taskInfo}>
                          <Text
                            variant="titleSmall"
                            style={styles.taskTitle}
                            numberOfLines={2}
                          >
                            {task.title}
                          </Text>
                          {task.description && (
                            <Text
                              variant="bodySmall"
                              style={styles.taskDescription}
                              numberOfLines={2}
                            >
                              {task.description}
                            </Text>
                          )}
                        </View>
                        {renderTaskActions(task)}
                      </View>

                      <View style={styles.taskFooter}>
                        <View style={styles.chips}>
                          <Chip
                            mode="flat"
                            textStyle={{ fontSize: 11 }}
                            style={{
                              backgroundColor:
                                getPriorityColor(task.priority) + "20",
                            }}
                          >
                            {getPriorityLabel(task.priority)}
                          </Chip>
                          <Chip
                            mode="flat"
                            textStyle={{ fontSize: 11 }}
                            style={{
                              backgroundColor:
                                getStatusColor(task.status) + "20",
                            }}
                          >
                            {getStatusLabel(task.status)}
                          </Chip>
                        </View>
                        {dueDateInfo && (
                          <View style={styles.dueDate}>
                            <MaterialCommunityIcons
                              name="calendar-clock"
                              size={14}
                              color={dueDateInfo.color}
                            />
                            <Text
                              variant="bodySmall"
                              style={{ color: dueDateInfo.color, fontSize: 11 }}
                            >
                              {dueDateInfo.text}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableRipple>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
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
  header: {
    padding: 16,
    paddingTop: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontWeight: "700",
    color: palette.text,
  },
  subtitle: {
    color: palette.textSecondary,
    marginTop: 4,
  },
  searchbar: {
    marginBottom: 12,
    backgroundColor: palette.surface,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    backgroundColor: palette.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: palette.text,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    color: palette.textSecondary,
  },
  taskCard: {
    borderRadius: 12,
  },
  card: {
    backgroundColor: palette.surface,
    elevation: 1,
    shadowColor: "transparent",
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
  },
  cardContent: {
    padding: 12,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 2,
  },
  taskDescription: {
    color: palette.textSecondary,
  },
  taskActions: {
    flexDirection: "row",
    gap: 4,
  },
  taskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chips: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
  },
  dueDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
