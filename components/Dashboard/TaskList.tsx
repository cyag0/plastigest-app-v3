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
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadTasks();
  }, [selectedCompany, status]);

  const loadTasks = async () => {
    if (!selectedCompany) return;

    try {
      setLoading(true);
      const params: any = {
        assigned_to: "me",
        sort_by: "due_date",
        sort_order: "asc",
        per_page: limit || 10,
      };

      if (status) {
        params.status = status;
      } else {
        // By default show only pending and in_progress
        params.status = "pending";
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
              onPress={loadTasks}
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

  if (tasks.length === 0) {
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
              onPress={loadTasks}
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
            onPress={loadTasks}
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

      <ScrollView style={{ marginBottom: 8 }}>
        <View style={styles.container}>
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
        </View>
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
});
