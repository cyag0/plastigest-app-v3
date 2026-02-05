import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";

interface TaskListProps {
  limit?: number;
  status?: App.Entities.TaskStatus;
}

export default function TaskList({ limit, status }: TaskListProps) {
  const [tasks, setTasks] = useState<App.Entities.Task[]>([]);
  const [reminders, setReminders] = useState<App.Entities.Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [completingReminderId, setCompletingReminderId] = useState<number | null>(null);
  const { selectedCompany } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [selectedCompany, status]);

  const loadData = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      
      // Cargar tareas
      const tasksParams: any = {
        assigned_to: "me",
        sort_by: "due_date",
        sort_order: "asc",
        per_page: limit || 10,
      };

      if (status) {
        tasksParams.status = status;
      } else {
        tasksParams.status = "pending";
      }

      // Cargar recordatorios pendientes
      const remindersParams: any = {
        status: "pending",
        sort_by: "reminder_date",
        sort_order: "asc",
        per_page: limit || 10,
      };

      const [tasksResponse, remindersResponse] = await Promise.all([
        Services.tasks.index(tasksParams).catch(() => ({ data: [] })),
        Services.reminders.index(remindersParams).catch(() => ({ data: [] })),
      ]);

      const tasksData = Array.isArray(tasksResponse.data)
        ? tasksResponse.data
        : tasksResponse.data?.data || [];
      
      const remindersData = Array.isArray(remindersResponse.data)
        ? remindersResponse.data
        : remindersResponse.data?.data || [];

      setTasks(tasksData);
      setReminders(remindersData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: App.Entities.TaskPriority) => {
    switch (priority) {
      case "urgent":
        return palette.red;
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
        return palette.red;
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
        color: palette.red,
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

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case "payment":
        return "cash";
      case "renewal":
        return "refresh-circle";
      case "expiration":
        return "alert-circle";
      default:
        return "bell";
    }
  };

  const getReminderTypeColor = (type: string) => {
    switch (type) {
      case "payment":
        return palette.warning;
      case "renewal":
        return palette.blue;
      case "expiration":
        return palette.red;
      default:
        return palette.accent;
    }
  };

  const handleCompleteTask = async (taskId: number, event: any) => {
    event.stopPropagation();
    
    try {
      setCompletingTaskId(taskId);
      await Services.tasks.changeStatus(taskId, "complete");
      
      // Actualizar la lista de tareas
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error: any) {
      console.error("Error completing task:", error);
      alert(error?.response?.data?.message || "Error al completar la tarea");
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleCompleteReminder = async (reminderId: number, event: any) => {
    event.stopPropagation();
    
    try {
      setCompletingReminderId(reminderId);
      await Services.reminders.markAsCompleted(reminderId);
      
      // Actualizar la lista de recordatorios
      setReminders(reminders.filter((r) => r.id !== reminderId));
    } catch (error: any) {
      console.error("Error completing reminder:", error);
      alert(error?.response?.data?.message || "Error al completar el recordatorio");
    } finally {
      setCompletingReminderId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
            Mis Tareas
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              icon="refresh"
              size={20}
              onPress={loadData}
              disabled={loading}
            />
            <Chip
              mode="outlined"
              textStyle={{ fontSize: 12 }}
              onPress={() => router.push("/(stacks)/tasks" as any)}
            >
              Ver todas
            </Chip>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </View>
    );
  }

  if (tasks.length === 0 && reminders.length === 0) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
            Mis Tareas
          </Text>
          <View style={styles.headerActions}>
            <IconButton
              icon="refresh"
              size={20}
              onPress={loadData}
              disabled={loading}
            />
            <Chip
              mode="outlined"
              textStyle={{ fontSize: 12 }}
              onPress={() => router.push("/(stacks)/tasks" as any)}
            >
              Ver todas
            </Chip>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="checkbox-marked-circle-outline"
            size={64}
            color={palette.textSecondary}
          />
          <Text variant="titleMedium" style={styles.emptyText}>
            ¡No tienes tareas pendientes!
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            Todas tus tareas están completadas
          </Text>
          <Button
            mode="outlined"
            onPress={() => router.push("/(stacks)/tasks" as any)}
            style={{ marginTop: 16 }}
          >
            Ver todas las tareas
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
          Mis Tareas
        </Text>
        <View style={styles.headerActions}>
          <IconButton
            icon="refresh"
            size={20}
            onPress={loadData}
            disabled={loading}
          />
          <Chip
            mode="outlined"
            textStyle={{ fontSize: 12 }}
            onPress={() => router.push("/(stacks)/tasks" as any)}
          >
            Ver todas
          </Chip>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
          {/* Renderizar recordatorios */}
          {reminders.map((reminder) => {
            const dueDateInfo = formatDueDate(reminder.reminder_date);
            const isOverdue = reminder.is_overdue;

            return (
              <TouchableRipple
                key={`reminder-${reminder.id}`}
                onPress={() =>
                  router.push(`/(tabs)/home/reminders/${reminder.id}` as any)
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
                              getReminderTypeColor(reminder.type) + "20",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getReminderTypeIcon(reminder.type) as any}
                          size={24}
                          color={getReminderTypeColor(reminder.type)}
                        />
                      </View>
                      <View style={styles.taskInfo}>
                        <Text
                          variant="titleSmall"
                          style={styles.taskTitle}
                          numberOfLines={1}
                        >
                          {reminder.title}
                        </Text>
                        {reminder.description && (
                          <Text
                            variant="bodySmall"
                            style={styles.taskDescription}
                            numberOfLines={1}
                          >
                            {reminder.description}
                          </Text>
                        )}
                      </View>
                      {reminder.status !== "completed" && (
                        <IconButton
                          icon="check-circle"
                          size={28}
                          iconColor={palette.success}
                          style={styles.completeButton}
                          disabled={completingReminderId === reminder.id}
                          onPress={(e) => handleCompleteReminder(reminder.id, e)}
                        />
                      )}
                    </View>

                    <View style={styles.taskFooter}>
                      <View style={styles.chips}>
                        <Chip
                          mode="flat"
                          textStyle={{ fontSize: 11 }}
                          style={{
                            backgroundColor:
                              getReminderTypeColor(reminder.type) + "20",
                          }}
                        >
                          {reminder.type_label}
                        </Chip>
                        {reminder.is_recurring && (
                          <Chip
                            mode="flat"
                            icon="refresh"
                            textStyle={{ fontSize: 11 }}
                            style={{
                              backgroundColor: palette.blue + "20",
                            }}
                          >
                            Recurrente
                          </Chip>
                        )}
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
          })}

          {/* Renderizar tareas */}
          {tasks.map((task) => {
            const dueDateInfo = formatDueDate(task.due_date);
            const isOverdue = task.is_overdue || task.status === "overdue";

            return (
              <TouchableRipple
                key={task.id}
                onPress={() => router.push(`/(stacks)/tasks/${task.id}` as any)}
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
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        {task.description && (
                          <Text
                            variant="bodySmall"
                            style={styles.taskDescription}
                            numberOfLines={1}
                          >
                            {task.description}
                          </Text>
                        )}
                      </View>
                      {task.status !== "completed" && task.status !== "cancelled" && (
                        <IconButton
                          icon="check-circle"
                          size={28}
                          iconColor={palette.success}
                          style={styles.completeButton}
                          disabled={completingTaskId === task.id}
                          onPress={(e) => handleCompleteTask(task.id, e)}
                        />
                      )}
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
                            backgroundColor: getStatusColor(task.status) + "20",
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
          })}
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scrollView: {
    maxHeight: 600,
  },
  container: {
    gap: 12,
    paddingBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
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
    elevation: 0,
    shadowColor: "transparent",
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: palette.red,
  },
  cardContent: {
    padding: 12,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
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
  completeButton: {
    margin: 0,
  },
});
