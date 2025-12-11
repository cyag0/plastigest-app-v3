import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const [task, setTask] = useState<App.Entities.Task | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await Services.tasks.show(Number(id));
      const data = response.data?.data || response.data;
      setTask(data);
    } catch (error) {
      console.error("Error loading task:", error);
      Alert.alert("Error", "No se pudo cargar la tarea");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: App.Entities.TaskStatus) => {
    try {
      await Services.tasks.update(Number(id), { status });
      loadTask();
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "No se pudo actualizar la tarea");
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

  const getTypeLabel = (type: App.Entities.TaskType) => {
    switch (type) {
      case "inventory_count":
        return "Conteo de Inventario";
      case "receive_purchase":
        return "Recibir Compra";
      case "approve_transfer":
        return "Aprobar Transferencia";
      case "send_transfer":
        return "Enviar Transferencia";
      case "receive_transfer":
        return "Recibir Transferencia";
      case "sales_report":
        return "Reporte de Ventas";
      case "stock_check":
        return "Verificación de Stock";
      case "adjustment_review":
        return "Revisar Ajuste";
      case "custom":
        return "Personalizada";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (!task) {
    return null;
  }

  const isOverdue = task.is_overdue || task.status === "overdue";
  const canComplete =
    task.status !== "completed" && task.status !== "cancelled";
  const canStart = task.status === "pending";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Task Icon & Title */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.taskHeader}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: getPriorityColor(task.priority) + "20",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={getTypeIcon(task.type) as any}
                  size={48}
                  color={getPriorityColor(task.priority)}
                />
              </View>
              <Text variant="headlineSmall" style={styles.title}>
                {task.title}
              </Text>
            </View>

            {/* Status & Priority */}
            <View style={styles.chips}>
              <Chip
                mode="flat"
                style={{
                  backgroundColor: getStatusColor(task.status) + "20",
                }}
              >
                {getStatusLabel(task.status)}
              </Chip>
              <Chip
                mode="flat"
                style={{
                  backgroundColor: getPriorityColor(task.priority) + "20",
                }}
              >
                {getPriorityLabel(task.priority)}
              </Chip>
            </View>

            {isOverdue && (
              <View style={styles.overdueAlert}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={palette.error}
                />
                <Text variant="bodyMedium" style={styles.overdueText}>
                  Esta tarea está vencida
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Description */}
        {task.description && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="text"
                  size={24}
                  color={palette.primary}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Descripción
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.description}>
                {task.description}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Details */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="information"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Información
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>
                Tipo:
              </Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {getTypeLabel(task.type)}
              </Text>
            </View>

            {task.due_date && (
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  Fecha de vencimiento:
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {new Date(task.due_date).toLocaleDateString()}
                </Text>
              </View>
            )}

            {task.location && (
              <View style={styles.detailRow}>
                <Text variant="bodyMedium" style={styles.detailLabel}>
                  Sucursal:
                </Text>
                <Text variant="bodyMedium" style={styles.detailValue}>
                  {task.location.name}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text variant="bodyMedium" style={styles.detailLabel}>
                Creada:
              </Text>
              <Text variant="bodyMedium" style={styles.detailValue}>
                {new Date(task.created_at).toLocaleDateString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      {canComplete && (
        <View style={styles.actions}>
          {canStart && (
            <Button
              mode="outlined"
              icon="play-circle"
              onPress={() => handleUpdateStatus("in_progress")}
              style={[
                styles.actionButton,
                {
                  backgroundColor: "#fff",
                },
              ]}
            >
              Iniciar Tarea
            </Button>
          )}
          <Button
            mode="contained"
            icon="check-circle"
            onPress={() => handleUpdateStatus("completed")}
            style={styles.actionButton}
            buttonColor={palette.success}
          >
            Marcar como Completada
          </Button>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    paddingVertical: 8,
    paddingHorizontal: 8,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: "700",
    color: palette.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: palette.surface,
    elevation: 0,
    shadowColor: "transparent",
  },
  taskHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontWeight: "700",
    color: palette.text,
    textAlign: "center",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
  },
  overdueAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: palette.error + "10",
    borderRadius: 8,
  },
  overdueText: {
    color: palette.error,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "600",
    color: palette.text,
  },
  description: {
    color: palette.text,
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.background,
  },
  detailLabel: {
    color: palette.textSecondary,
    fontWeight: "600",
  },
  detailValue: {
    color: palette.text,
  },
  actions: {
    gap: 12,
    padding: 16,
    backgroundColor: palette.surface,
  },
  actionButton: {
    borderRadius: 8,
  },
});
