import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Card, Chip, Divider, IconButton, Text } from "react-native-paper";
import {
  formatTaskDate,
  getTaskDueDateInfo,
  getTaskPriorityConfig,
  getTaskStatusConfig,
  getTaskTypeConfig,
  isTaskActionable,
} from "./taskPresentation";

type TaskAction = "start" | "complete" | "cancel";

type TaskComment = App.Entities.TaskComment;

function getUserName(user?: App.Entities.User | null) {
  return user?.name || "Sin asignar";
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelRow}>
        <MaterialCommunityIcons name={icon as any} size={17} color={palette.textSecondary} />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function CommentsSection({
  comments,
  onAddComment,
}: {
  comments: TaskComment[];
  onAddComment?: (comment: string) => Promise<void>;
}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmedComment = comment.trim();
    if (!trimmedComment || !onAddComment) {
      return;
    }

    try {
      setSending(true);
      await onAddComment(trimmedComment);
      setComment("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="comment-text-outline" size={21} color={palette.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Comentarios
          </Text>
        </View>
        <Divider style={styles.divider} />

        {comments.length === 0 ? (
          <View style={styles.emptyComments}>
            <MaterialCommunityIcons name="comment-outline" size={30} color={palette.textSecondary} />
            <Text style={styles.emptyCommentsText}>Sin comentarios registrados</Text>
          </View>
        ) : (
          <View style={styles.commentsList}>
            {comments.map((item) => (
              <View key={item.id} style={styles.commentItem}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {(item.user?.name || "U").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{item.user?.name || "Usuario"}</Text>
                    <Text style={styles.commentDate}>{formatTaskDate(item.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText}>{item.comment}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {onAddComment && (
          <View style={styles.commentComposer}>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Agregar comentario"
              placeholderTextColor={palette.textSecondary}
              multiline
              style={styles.commentInput}
            />
            <Button
              mode="contained"
              icon="send"
              onPress={handleSend}
              loading={sending}
              disabled={sending || !comment.trim()}
              buttonColor={palette.primary}
              style={styles.commentButton}
            >
              Enviar
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default function TaskDetailContent({
  task,
  onBack,
  onChangeStatus,
  onAddComment,
  compact = false,
}: {
  task: App.Entities.Task;
  onBack?: () => void;
  onChangeStatus?: (action: TaskAction) => Promise<void>;
  onAddComment?: (comment: string) => Promise<void>;
  compact?: boolean;
}) {
  const typeConfig = getTaskTypeConfig(task.type);
  const statusConfig = getTaskStatusConfig(task.status);
  const priorityConfig = getTaskPriorityConfig(task.priority);
  const dueDateInfo = getTaskDueDateInfo(task);
  const comments = ((task as any).comments ?? []) as TaskComment[];
  const canStart = task.status === "pending";
  const canComplete = isTaskActionable(task);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={[styles.heroCard, task.is_overdue && styles.heroCardOverdue]} mode="elevated">
          <Card.Content style={styles.heroContent}>
            <View style={[styles.heroIcon, { backgroundColor: typeConfig.softBg }]}>
              <MaterialCommunityIcons name={typeConfig.icon as any} size={32} color={typeConfig.color} />
            </View>
            <View style={styles.heroText}>
              <View style={styles.chipsRow}>
                <Chip
                  compact
                  mode="flat"
                  icon={statusConfig.icon}
                  style={[styles.chip, { backgroundColor: statusConfig.softBg }]}
                  textStyle={[styles.chipText, { color: statusConfig.color }]}
                >
                  {statusConfig.label}
                </Chip>
                <Chip
                  compact
                  mode="flat"
                  icon={priorityConfig.icon}
                  style={[styles.chip, { backgroundColor: priorityConfig.softBg }]}
                  textStyle={[styles.chipText, { color: priorityConfig.color }]}
                >
                  {priorityConfig.label}
                </Chip>
                <Chip
                  compact
                  mode="flat"
                  icon={typeConfig.icon}
                  style={[styles.chip, { backgroundColor: typeConfig.softBg }]}
                  textStyle={[styles.chipText, { color: typeConfig.color }]}
                >
                  {typeConfig.shortLabel}
                </Chip>
              </View>
              <Text variant="headlineSmall" style={styles.title}>
                {task.title}
              </Text>
              {dueDateInfo && (
                <View style={[styles.dueBadge, { backgroundColor: dueDateInfo.softBg }]}> 
                  <MaterialCommunityIcons name={dueDateInfo.icon as any} size={15} color={dueDateInfo.color} />
                  <Text style={[styles.dueBadgeText, { color: dueDateInfo.color }]}>{dueDateInfo.text}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {task.description && (
          <Card style={styles.card} mode="elevated">
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="text-box-outline" size={21} color={palette.primary} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Descripcion
                </Text>
              </View>
              <Divider style={styles.divider} />
              <Text style={styles.description}>{task.description}</Text>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="information-outline" size={21} color={palette.primary} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Informacion
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailsList}>
              <DetailRow label="Tipo" value={typeConfig.label} icon="shape-outline" />
              <DetailRow label="Asignada a" value={getUserName(task.assignedTo)} icon="account-check-outline" />
              <DetailRow label="Asignada por" value={getUserName(task.assignedBy)} icon="account-arrow-right-outline" />
              {task.completedBy && (
                <DetailRow label="Completada por" value={getUserName(task.completedBy)} icon="account-star-outline" />
              )}
              <DetailRow label="Sucursal" value={task.location?.name || "Sin sucursal"} icon="map-marker-outline" />
              <DetailRow label="Vencimiento" value={formatTaskDate(task.due_date, true)} icon="calendar-clock" />
              <DetailRow label="Creada" value={formatTaskDate(task.created_at, true)} icon="calendar-plus" />
              {task.completed_at && (
                <DetailRow label="Completada" value={formatTaskDate(task.completed_at, true)} icon="calendar-check" />
              )}
            </View>
          </Card.Content>
        </Card>

        <CommentsSection comments={comments} onAddComment={onAddComment} />
      </ScrollView>

      {(onBack || (onChangeStatus && canComplete)) && (
        <View style={styles.bottomActions}>
          {onBack && (
            <IconButton
              icon="arrow-left"
              size={20}
              iconColor={palette.textSecondary}
              onPress={onBack}
              style={styles.backIconButton}
            />
          )}
          {onChangeStatus && canStart && (
            <Button
              mode="outlined"
              icon="play-circle-outline"
              onPress={() => onChangeStatus("start")}
              style={styles.actionButton}
              textColor={palette.blue}
            >
              Iniciar
            </Button>
          )}
          {onChangeStatus && canComplete && (
            <Button
              mode="contained"
              icon="check-circle-outline"
              onPress={() => onChangeStatus("complete")}
              buttonColor={palette.success}
              style={styles.actionButton}
            >
              Completar
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  containerCompact: {
    minHeight: 0,
    backgroundColor: "transparent",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 124,
    gap: 14,
  },
  scrollContentCompact: {
    padding: 0,
    paddingBottom: 90,
  },
  heroCard: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
  },
  heroCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  heroText: {
    flex: 1,
    gap: 9,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  title: {
    color: palette.text,
    fontWeight: "900",
    lineHeight: 31,
  },
  dueBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dueBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    borderRadius: 8,
    backgroundColor: "#F8F5EF",
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: palette.text,
    fontWeight: "800",
  },
  divider: {
    marginVertical: 12,
    backgroundColor: palette.border,
  },
  description: {
    color: palette.text,
    lineHeight: 23,
  },
  detailsList: {
    gap: 10,
  },
  detailRow: {
    gap: 5,
    padding: 11,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  detailLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  detailValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyComments: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 18,
  },
  emptyCommentsText: {
    color: palette.textSecondary,
    fontWeight: "600",
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    flexDirection: "row",
    gap: 10,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: {
    color: "#fff",
    fontWeight: "900",
  },
  commentBody: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: palette.surface,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  commentUser: {
    color: palette.text,
    fontWeight: "800",
    flex: 1,
  },
  commentDate: {
    color: palette.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  commentText: {
    color: palette.text,
    lineHeight: 20,
  },
  commentComposer: {
    marginTop: 14,
    gap: 8,
  },
  commentInput: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    padding: 10,
    color: palette.text,
    backgroundColor: palette.background,
    textAlignVertical: "top",
  },
  commentButton: {
    alignSelf: "flex-end",
    borderRadius: 8,
  },
  bottomActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "#F8F5EF",
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  backIconButton: {
    margin: 0,
    backgroundColor: palette.surface,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
});
