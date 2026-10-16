import { ListRow } from "@/components/App/ListGroup";
import type { Palette } from "@/constants/palette";
import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { Text } from "react-native";
import {
  getTaskStateIcon,
  getTaskStatusLine,
  type TaskTone,
} from "./taskPresentation";

/** Color del tema para un tono; undefined = el color normal del texto. */
export function taskToneColor(colors: Palette, tone: TaskTone): string | undefined {
  switch (tone) {
    case "error":
      return colors.error;
    case "warning":
      return colors.warning;
    case "success":
      return colors.success;
    case "muted":
      return colors.textMuted;
    default:
      return undefined;
  }
}

/**
 * Renglón de tarea: el mismo en Inicio ("Tus tareas") y en la lista de
 * Tareas. Ícono del estado, título y "Pendiente · Urgente · Vencida hace 3
 * días" (la fecha resaltada si ya venció o vence pronto).
 */
export default function TaskRow({
  task,
  onPress,
  currentLocationId,
}: {
  task: App.Entities.Task;
  onPress: () => void;
  /** Si la tarea es de otra sucursal, se agrega su nombre a la línea. */
  currentLocationId?: number | null;
}) {
  const { colors } = useTheme();
  const state = getTaskStateIcon(task);
  const line = getTaskStatusLine(task);
  const otherLocation =
    currentLocationId != null && task.location?.id != null && task.location.id !== currentLocationId
      ? task.location.name
      : null;
  const dueColor = line.due ? taskToneColor(colors, line.due.tone) : undefined;

  return (
    <ListRow
      icon={state.icon}
      iconColor={taskToneColor(colors, state.tone)}
      title={task.title || "Tarea"}
      titleLines={2}
      subtitle={
        <>
          {line.text}
          {line.due && (
            <Text style={dueColor ? { color: dueColor } : undefined}>{` · ${line.due.text}`}</Text>
          )}
          {otherLocation ? ` · ${otherLocation}` : ""}
        </>
      }
      onPress={onPress}
    />
  );
}
