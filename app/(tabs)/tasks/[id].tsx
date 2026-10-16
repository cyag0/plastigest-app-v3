import EmptyState from "@/components/App/EmptyState";
import NoPermissionView from "@/components/App/NoPermissionView";
import TaskDetailContent, {
  type TaskAction,
} from "@/components/Tasks/TaskDetailContent";
import {
  getTaskErrorMessage,
  mergeUpdatedTask,
  TASK_ACTION_MESSAGES,
  getTaskPermissions,
} from "@/components/Tasks/taskPresentation";
import { useLinkedRecordOpener } from "@/components/Notifications/useLinkedRecordOpener";
import { fetchTask, isTaskNotFound } from "@/components/Tasks/taskQueries";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { errorMessageOf } from "@/utils/errorNotice";
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
  const { open: openLinkedRecord } = useLinkedRecordOpener();
  const [task, setTask] = useState<App.Entities.Task | null>(null);
  const [loading, setLoading] = useState(true);
  // No se pudo cargar: el motivo (sin conexión, error del servidor…) y se
  // ofrece reintentar; un 403 muestra la vista «sin permiso».
  const [loadError, setLoadError] = useState<{ forbidden: boolean; message: string } | null>(null);
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
      setTask(await fetchTask(taskId));
      setLoadError(null);
      loadedOnceRef.current = true;
    } catch (error) {
      // Ya no existe: se muestra el estado vacío en lugar de un error.
      if (isTaskNotFound(error)) {
        setTask(null);
      } else if (!loadedOnceRef.current) {
        setLoadError({
          forbidden: (error as any)?.response?.status === 403,
          message: errorMessageOf(error, "Revisa tu conexión e intenta de nuevo."),
        });
      }
      // Al volver a la pantalla sin conexión se queda la que ya se veía.
    } finally {
      setLoading(false);
    }
  }, [taskId]);

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

  if (!task && loadError?.forbidden) {
    return <NoPermissionView />;
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        {loadError ? (
          <EmptyState
            icon="cloud-off-outline"
            title="No se pudo cargar la tarea"
            description={loadError.message}
            actionLabel="Reintentar"
            onAction={loadTask}
          />
        ) : (
          <EmptyState
            icon="clipboard-remove-outline"
            title="Esta tarea ya no existe"
            description="Pudo haberse eliminado."
            actionLabel="Ver mis tareas"
            onAction={() => router.replace("/(tabs)/tasks" as any)}
          />
        )}
      </View>
    );
  }

  const permissions = getTaskPermissions(task, user?.id, hasTasksUpdate);

  return (
    <TaskDetailContent
      task={task}
      onChangeStatus={handleChangeStatus}
      onAddComment={handleAddComment}
      onOpenLink={(link) => openLinkedRecord(link)}
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
