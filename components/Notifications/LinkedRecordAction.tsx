import type { NotificationLink } from "@/components/Notifications/notificationLinks";
import {
  forbiddenLinkNote,
  isLinkedRecordNote,
  type LinkedRecordNote,
  type LinkedRecordOutcome,
} from "@/components/Notifications/useLinkedRecordOpener";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "react-native-paper";

const NOTE_ICONS = {
  forbidden: "lock-outline",
  gone: "file-remove-outline",
  unavailable: "store-off-outline",
} as const;

/**
 * Botón "Ver compra / Ver transferencia…" del detalle de una tarea o una
 * notificación. Antes de navegar revisa permiso, que el registro exista y su
 * sucursal (useLinkedRecordOpener); si no se puede abrir, en lugar del botón
 * queda una línea que explica por qué (sin permiso, ya no existe, otra
 * sucursal).
 *
 * `initialNote` solo se lee al montar: para otro registro, el padre cambia
 * la `key`.
 *
 * `onOpen` es el `open` de useLinkedRecordOpener del padre: dentro de un
 * modal de Paper (Portal) no hay AlertsProvider, así que este componente no
 * puede pedir los avisos por su cuenta.
 */
export default function LinkedRecordAction({
  link,
  onOpen,
  mode = "contained",
  initialNote = null,
  autoOpen = false,
}: {
  link: NotificationLink | null;
  /** Abre el registro (y cierra el modal del padre si navega). */
  onOpen: (link: NotificationLink) => Promise<LinkedRecordOutcome>;
  mode?: "contained" | "outlined";
  /** Resultado que ya se obtuvo (p. ej. al tocar el aviso en la lista). */
  initialNote?: LinkedRecordNote | null;
  /** Abrir el registro al montar (push tocado): una sola vez. */
  autoOpen?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { canAccessRoute } = useCan();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<LinkedRecordNote | null>(initialNote);
  const mountedRef = useRef(true);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleOpen = useCallback(async () => {
    if (!link || busy) return;
    setBusy(true);
    try {
      const outcome = await onOpen(link);
      if (mountedRef.current && isLinkedRecordNote(outcome)) setNote(outcome);
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, link, onOpen]);

  useEffect(() => {
    if (!autoOpen || !link || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    void handleOpen();
  }, [autoOpen, handleOpen, link]);

  if (!link) return null;

  // Sin permiso para la pantalla destino no se ofrece el botón.
  const shown = !canAccessRoute(link.route) ? forbiddenLinkNote(link) : note;

  if (shown) {
    return (
      <View style={styles.note} accessibilityRole="text">
        <MaterialCommunityIcons name={NOTE_ICONS[shown.type]} size={18} color={colors.textMuted} />
        <Text style={styles.noteText}>{shown.message}</Text>
      </View>
    );
  }

  return (
    <Button
      mode={mode}
      icon="arrow-right"
      contentStyle={styles.buttonContent}
      onPress={handleOpen}
      loading={busy}
      disabled={busy}
      style={styles.button}
    >
      {link.label}
    </Button>
  );
}

const makeStyles = themedStyles((c) => ({
  button: { alignSelf: "flex-start" },
  buttonContent: { flexDirection: "row-reverse" },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.textSecondary },
}));
