import {
  LIST_TEXT_INSET,
  ListGroup,
  ListSection,
  ListValueRow,
} from "@/components/App/ListGroup";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDateTime } from "@/utils/dates";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Button } from "react-native-paper";
import { taskToneColor } from "./TaskRow";
import {
  canStartTask,
  getTaskRelatedLink,
  getTaskStateIcon,
  getTaskStatusLine,
  getTaskTypeConfig,
  getTaskUser,
  isTaskActionable,
} from "./taskPresentation";

export type TaskAction = "start" | "complete" | "cancel";

function CommentComposer({
  onAddComment,
}: {
  onAddComment: (comment: string) => Promise<boolean | void>;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    try {
      setSending(true);
      // Si falla se conserva el texto para reintentar.
      const saved = await onAddComment(trimmed);
      if (saved !== false) setComment("");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.composer}>
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Escribe un comentario…"
        placeholderTextColor={colors.textMuted}
        multiline
        style={styles.composerInput}
      />
      <Button
        mode="contained-tonal"
        onPress={handleSend}
        loading={sending}
        disabled={sending || !comment.trim()}
        style={styles.composerButton}
      >
        Comentar
      </Button>
    </View>
  );
}

/**
 * Detalle de una tarea, en su pantalla (teléfono) o en el modal de la lista
 * (escritorio). `canAct` / `canCancel` vienen de getTaskPermissions (misma
 * regla que el backend: tasks_update, o ser responsable / creador).
 */
export default function TaskDetailContent({
  task,
  onChangeStatus,
  onAddComment,
  onOpenRoute,
  canAct = true,
  canCancel,
  pendingAction = null,
}: {
  task: App.Entities.Task;
  onChangeStatus?: (action: TaskAction) => Promise<void>;
  onAddComment?: (comment: string) => Promise<boolean | void>;
  /** Abre una ruta (registro relacionado); el padre cierra su modal si aplica. */
  onOpenRoute?: (route: string) => void;
  canAct?: boolean;
  /** Cancelar: tasks_update o quien creó la tarea (por defecto, igual que canAct). */
  canCancel?: boolean;
  /** Acción en curso: deshabilita los botones para evitar dobles envíos. */
  pendingAction?: TaskAction | null;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 768;

  const type = getTaskTypeConfig(task.type);
  const state = getTaskStateIcon(task);
  const line = getTaskStatusLine(task);
  const comments = task.comments ?? [];
  const isOpen = isTaskActionable(task);
  const showActions = Boolean(onChangeStatus) && canAct && isOpen;
  const canStart = showActions && canStartTask(task);
  const busy = pendingAction !== null;
  const relatedLink = onOpenRoute ? getTaskRelatedLink(task) : null;
  const assignedTo = getTaskUser(task, "assigned_to");
  const assignedBy = getTaskUser(task, "assigned_by");
  const completedBy = getTaskUser(task, "completed_by");
  const dueColor = line.due ? taskToneColor(colors, line.due.tone) : undefined;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          wide && styles.contentWide,
          showActions && styles.contentWithBar,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name={type.icon} size={16} color={colors.textSecondary} />
            <Text style={styles.meta} numberOfLines={1}>
              {type.label}
              {task.location?.name ? ` · ${task.location.name}` : ""}
            </Text>
          </View>
          <Text style={styles.title}>{task.title}</Text>
          <View style={styles.statusRow}>
            <MaterialCommunityIcons
              name={state.icon}
              size={18}
              color={taskToneColor(colors, state.tone) ?? colors.textSecondary}
            />
            <Text style={styles.status}>
              {line.text}
              {line.due && (
                <Text style={dueColor ? { color: dueColor } : undefined}>
                  {` · ${line.due.text}`}
                </Text>
              )}
            </Text>
          </View>
        </View>

        {relatedLink && onOpenRoute && (
          <Button
            mode="outlined"
            icon="arrow-right"
            contentStyle={styles.relatedButtonContent}
            onPress={() => onOpenRoute(relatedLink.route)}
            style={styles.relatedButton}
          >
            {relatedLink.label}
          </Button>
        )}

        {!!task.description && (
          <ListSection title="Descripción">
            <Text style={styles.body} selectable>
              {task.description}
            </Text>
          </ListSection>
        )}

        <ListSection title="Detalles">
          <ListGroup inset={LIST_TEXT_INSET}>
            <ListValueRow label="Asignada a" value={assignedTo?.name || "Sin asignar"} />
            <ListValueRow label="Asignada por" value={assignedBy?.name || "Sistema"} />
            {completedBy && <ListValueRow label="Completada por" value={completedBy.name} />}
            <ListValueRow
              label="Fecha límite"
              value={task.due_date ? formatDateTime(task.due_date) : "Sin fecha límite"}
            />
            <ListValueRow label="Creada" value={formatDateTime(task.created_at)} />
            {!!task.completed_at && (
              <ListValueRow label="Completada" value={formatDateTime(task.completed_at)} />
            )}
          </ListGroup>
        </ListSection>

        {!canAct && isOpen && onChangeStatus && (
          <View style={styles.note}>
            <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
            <Text style={styles.noteText}>
              Solo quien tiene asignada la tarea, quien la creó o un rol con
              &quot;Actualizar tareas&quot; puede iniciarla, completarla o comentarla. Las
              tareas del sistema (recibir una compra o una transferencia) se
              completan solas al terminar ese proceso.
            </Text>
          </View>
        )}

        <ListSection
          title="Comentarios"
          count={comments.length > 0 ? comments.length : undefined}
        >
          {comments.length > 0 ? (
            <ListGroup inset={LIST_TEXT_INSET}>
              {comments.map((item) => (
                <View key={item.id} style={styles.comment}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser} numberOfLines={1}>
                      {item.user?.name || "Usuario"}
                    </Text>
                    <Text style={styles.commentDate}>{formatDateTime(item.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText} selectable>
                    {item.comment}
                  </Text>
                </View>
              ))}
            </ListGroup>
          ) : (
            <Text style={styles.calm}>Todavía no hay comentarios.</Text>
          )}
          {canAct && onAddComment && <CommentComposer onAddComment={onAddComment} />}
        </ListSection>

        {showActions && (canCancel ?? canAct) && (
          <Button
            mode="text"
            icon="close-circle-outline"
            onPress={() => onChangeStatus?.("cancel")}
            disabled={busy}
            loading={pendingAction === "cancel"}
            textColor={colors.error}
            style={styles.cancelButton}
          >
            Cancelar tarea
          </Button>
        )}
      </ScrollView>

      {showActions && onChangeStatus && (
        <View style={styles.actionBar}>
          <View style={styles.actionBarInner}>
            {canStart && (
              <Button
                mode="outlined"
                icon="play-circle-outline"
                onPress={() => onChangeStatus("start")}
                disabled={busy}
                loading={pendingAction === "start"}
                style={styles.actionButton}
              >
                Iniciar
              </Button>
            )}
            <Button
              mode="contained"
              icon="check"
              onPress={() => onChangeStatus("complete")}
              disabled={busy}
              loading={pendingAction === "complete"}
              style={styles.actionButton}
            >
              Completar
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  container: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, gap: 22, paddingBottom: 32 },
  contentWide: { padding: 24, maxWidth: 760, width: "100%", alignSelf: "center" },
  // Deja libre el espacio de la barra de acciones fija.
  contentWithBar: { paddingBottom: 96 },

  header: { gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 13, fontWeight: "500", color: c.textSecondary, flexShrink: 1 },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: c.text,
    letterSpacing: -0.2,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  status: { fontSize: 14, fontWeight: "500", color: c.textSecondary, flexShrink: 1 },

  relatedButton: { alignSelf: "flex-start" },
  relatedButtonContent: { flexDirection: "row-reverse" },

  body: { fontSize: 15, lineHeight: 22, color: c.text },
  calm: { fontSize: 14, color: c.textSecondary },

  note: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, color: c.textSecondary },

  comment: { paddingHorizontal: 14, paddingVertical: 12, gap: 4 },
  commentHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  commentUser: { fontSize: 14, fontWeight: "600", color: c.text, flexShrink: 1 },
  commentDate: { fontSize: 12, color: c.textMuted },
  commentText: { fontSize: 14, lineHeight: 20, color: c.text },

  composer: { gap: 8, marginTop: 4 },
  composerInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: c.text,
    backgroundColor: c.surface,
    textAlignVertical: "top",
  },
  composerButton: { alignSelf: "flex-end" },

  cancelButton: { alignSelf: "flex-start", marginLeft: -12 },

  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  actionBarInner: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 712,
    alignSelf: "center",
  },
  actionButton: { flex: 1 },
}));
