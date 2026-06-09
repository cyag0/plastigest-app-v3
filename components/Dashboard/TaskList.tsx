/**
 * TaskList v2 — usa TaskRow (filas compactas 64px) en lugar
 * de cards altos. Estilo Linear/Notion. 6-8 tareas visibles
 * por pantalla sin scroll.
 */

import EmptyState from "@/components/App/EmptyState";
import SectionHeader from "@/components/App/SectionHeader";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import TaskRow, { TaskRowStatus } from "./TaskRow";

interface TaskListProps {
  limit?: number;
  status?: App.Entities.TaskStatus;
}

export default function TaskList({ limit, status }: TaskListProps) {
  const [tasks, setTasks] = useState<App.Entities.Task[]>([]);
  const [reminders, setReminders] = useState<App.Entities.Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [completingReminderId, setCompletingReminderId] = useState<
    number | null
  >(null);
  const { selectedCompany } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [selectedCompany, status]);

  async function loadData() {
    if (!selectedCompany) return;

    try {
      setLoading(true);

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
  }

  async function handleCompleteTask(taskId: number, event: any) {
    event?.stopPropagation?.();
    try {
      setCompletingTaskId(taskId);
      await Services.tasks.changeStatus(taskId, "complete");
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error: any) {
      console.error("Error completing task:", error);
      alert(error?.response?.data?.message || "Error al completar la tarea");
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleCompleteReminder(reminderId: number, event: any) {
    event?.stopPropagation?.();
    try {
      setCompletingReminderId(reminderId);
      await Services.reminders.markAsCompleted(reminderId);
      setReminders(reminders.filter((r) => r.id !== reminderId));
    } catch (error: any) {
      console.error("Error completing reminder:", error);
      alert(
        error?.response?.data?.message || "Error al completar el recordatorio"
      );
    } finally {
      setCompletingReminderId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <SectionHeader
          title="Mis Tareas"
          actionLabel="Ver todas"
          onAction={() => router.push("/(tabs)/tasks" as any)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={palette.primary} />
        </View>
      </View>
    );
  }

  if (tasks.length === 0 && reminders.length === 0) {
    return (
      <View style={styles.wrapper}>
        <SectionHeader
          title="Mis Tareas"
          actionLabel="Ver todas"
          onAction={() => router.push("/(tabs)/tasks" as any)}
        />
        <EmptyState
          icon="checkbox-marked-circle-outline"
          title="¡No tienes tareas pendientes!"
          description="Todas tus tareas están completadas"
          compact
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <SectionHeader
        title="Mis Tareas"
        badge={tasks.length + reminders.length}
        actionLabel="Ver todas"
        onAction={() => router.push("/(tabs)/tasks" as any)}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {reminders.map((reminder) => (
          <TaskRow
            key={`reminder-${reminder.id}`}
            id={reminder.id}
            icon={getReminderTypeIcon(reminder.type) as any}
            title={reminder.title}
            meta={buildReminderMeta(reminder)}
            status={mapReminderStatus(reminder)}
            isUnread={false}
            onPress={() =>
              router.push(`/(tabs)/home/reminders/${reminder.id}` as any)
            }
            onComplete={() => handleCompleteReminder(reminder.id, {})}
          />
        ))}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            id={task.id}
            icon={getTypeIcon(task.type) as any}
            title={task.title}
            meta={buildTaskMeta(task)}
            status={mapTaskStatus(task)}
            isUnread={false}
            onPress={() => router.push(`/(tabs)/tasks/${task.id}` as any)}
            onComplete={(e?: any) => handleCompleteTask(task.id, e ?? {})}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function getTypeIcon(type: App.Entities.TaskType): string {
  switch (type) {
    case "inventory_count":
      return "clipboard-list-outline";
    case "receive_purchase":
      return "package-variant";
    case "approve_transfer":
      return "check-circle-outline";
    case "send_transfer":
      return "truck-delivery-outline";
    case "receive_transfer":
      return "package-down";
    case "sales_report":
      return "chart-line";
    case "stock_check":
      return "magnify";
    case "adjustment_review":
      return "clipboard-edit-outline";
    case "custom":
      return "note-outline";
    default:
      return "checkbox-marked-circle-outline";
  }
}

function getReminderTypeIcon(type: string): string {
  switch (type) {
    case "payment":
      return "cash";
    case "renewal":
      return "refresh-circle";
    case "expiration":
      return "alert-circle-outline";
    default:
      return "bell-outline";
  }
}

function mapTaskStatus(task: App.Entities.Task): TaskRowStatus {
  if (task.is_overdue || task.status === "overdue") return "overdue";
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "completed") return "completed";
  if (task.status === "cancelled") return "cancelled";
  return "pending";
}

function mapReminderStatus(reminder: App.Entities.Reminder): TaskRowStatus {
  if (reminder.is_overdue) return "overdue";
  if (reminder.status === "completed") return "completed";
  return "pending";
}

function getPriorityLabel(priority: App.Entities.TaskPriority): string {
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
}

function getStatusLabel(status: App.Entities.TaskStatus): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "in_progress":
      return "En proceso";
    case "completed":
      return "Completada";
    case "cancelled":
      return "Cancelada";
    case "overdue":
      return "Vencida";
    default:
      return status;
  }
}

function buildTaskMeta(task: App.Entities.Task): string {
  const parts: string[] = [];
  parts.push(getPriorityLabel(task.priority));
  parts.push(getStatusLabel(task.status));
  const due = formatDueDate(task.due_date);
  if (due) parts.push(due);
  return parts.join(" · ");
}

function buildReminderMeta(reminder: App.Entities.Reminder): string {
  const parts: string[] = [];
  if (reminder.type_label) parts.push(reminder.type_label);
  const due = formatDueDate(reminder.reminder_date);
  if (due) parts.push(due);
  return parts.join(" · ");
}

function formatDueDate(dueDate?: string): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return "Vence hoy";
  if (diffDays === 1) return "Vence mañana";
  if (diffDays <= 7) return `Vence en ${diffDays}d`;
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  scrollView: {
    maxHeight: 600,
  },
  container: {
    gap: 8,
    paddingBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: "center",
  },
});
