import EmptyState from "@/components/App/EmptyState";
import TaskDetailContent, {
  type TaskAction,
} from "@/components/Tasks/TaskDetailContent";
import {
  getTaskErrorMessage,
  mergeUpdatedTask,
  TASK_ACTION_MESSAGES,
  getTaskPermissions,
} from "@/components/Tasks/taskPresentation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { hasPermission, user } = useAuth();
  const hasTasksUpdate = hasPermission("tasks_update");
  const [task, setTask] = useState<App.Entities.Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<TaskAction | null>(null);
  const loadedOnceRef = useRef(false);

  const taskId = Number(id);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      // El loader de pantalla completa solo la primera vez; al volver (p. ej.
      // de recibir la compra relacionada) se refresca sin parpadeo.
      if (!loadedOnceRef.current) setLoading(true);
      const response = await services.tasks.show(taskId);
      const data = response.data?.data || response.data;
      setTask(data as App.Entities.Task);
      loadedOnceRef.current = true;
    } catch (error) {
      console.error("Error loading task:", error);
      alerts.error(getTaskErrorMessage(error, "No se pudo cargar la tarea"));
    } finally {
      setLoading(false);
    }
  }, [alerts, taskId]);

  useFocusEffect(
    useCallback(() => {
      loadTask();
    }, [loadTask]),
  );

  const handleChangeStatus = async (action: TaskAction) => {
    if (!task || pendingAction) {
      return;
    }

    if (action === "cancel") {
      const confirmed = await alerts.confirm(
        "La tarea quedará cancelada y ya no se podrá completar.",
        { title: "¿Cancelar la tarea?", okText: "Cancelar tarea", cancelText: "Volver" },
      );
      if (!confirmed) return;
    }

    try {
      setPendingAction(action);
      const response = await services.tasks.changeStatus(task.id, action);
      const updatedTask = response?.task || response?.data;
      if (updatedTask?.id) {
        setTask((current) => (current ? mergeUpdatedTask(current, updatedTask) : current));
      } else {
        await loadTask();
      }
      alerts.success(TASK_ACTION_MESSAGES[action].success);
    } catch (error) {
      console.error("Error updating task:", error);
      alerts.error(getTaskErrorMessage(error, TASK_ACTION_MESSAGES[action].error));
      // El estado pudo cambiar en otro lado (400): se muestra el actual.
      await loadTask();
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!task) {
      return false;
    }

    try {
      await services.tasks.addComment(task.id, comment);
      await loadTask();
      alerts.success("Comentario agregado");
      return true;
    } catch (error) {
      console.error("Error adding task comment:", error);
      alerts.error(getTaskErrorMessage(error, "No se pudo agregar el comentario"));
      return false;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <EmptyState
          icon="clipboard-remove-outline"
          title="Tarea no encontrada"
          description="Pudo haberse eliminado o no tienes acceso a ella."
        />
      </View>
    );
  }

  const permissions = getTaskPermissions(task, user?.id, hasTasksUpdate);

  return (
    <TaskDetailContent
      task={task}
      onChangeStatus={handleChangeStatus}
      onAddComment={handleAddComment}
      onOpenRoute={(route) => router.push(route as any)}
      canAct={permissions.canAct}
      canCancel={permissions.canCancel}
      pendingAction={pendingAction}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
