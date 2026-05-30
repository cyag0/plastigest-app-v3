import TaskDetailContent from "@/components/Tasks/TaskDetailContent";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

type TaskAction = "start" | "complete" | "cancel";

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const alerts = useAlerts();
  const [task, setTask] = useState<App.Entities.Task | null>(null);
  const [loading, setLoading] = useState(true);

  const taskId = Number(id);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await services.tasks.show(taskId);
      const data = response.data?.data || response.data;
      setTask(data as App.Entities.Task);
    } catch (error) {
      console.error("Error loading task:", error);
      alerts.error("No se pudo cargar la tarea");
    } finally {
      setLoading(false);
    }
  }, [alerts, taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleChangeStatus = async (action: TaskAction) => {
    if (!task) {
      return;
    }

    try {
      const response = await services.tasks.changeStatus(task.id, action);
      const updatedTask = response.data?.task || response.data?.data || response.data;
      if (updatedTask?.id) {
        setTask(updatedTask as App.Entities.Task);
      } else {
        await loadTask();
      }
      alerts.success("Tarea actualizada correctamente");
    } catch (error) {
      console.error("Error updating task:", error);
      alerts.error("No se pudo actualizar la tarea");
    }
  };

  const handleAddComment = async (comment: string) => {
    if (!task) {
      return;
    }

    try {
      await services.tasks.addComment(task.id, comment);
      await loadTask();
      alerts.success("Comentario agregado");
    } catch (error) {
      console.error("Error adding task comment:", error);
      alerts.error("No se pudo agregar el comentario");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Cargando tarea...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Tarea no encontrada</Text>
        <Text style={styles.emptyText}>La tarea pudo haber sido eliminada o no tienes acceso.</Text>
      </View>
    );
  }

  return (
    <TaskDetailContent
      task={task}
      onBack={() => router.back()}
      onChangeStatus={handleChangeStatus}
      onAddComment={handleAddComment}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: palette.background,
  },
  loadingText: {
    marginTop: 12,
    color: palette.textSecondary,
    fontWeight: "700",
  },
  emptyTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
  },
});
