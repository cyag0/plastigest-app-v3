/**
 * Rechazar una solicitud de transferencia: el motivo de un toque («No tenemos
 * suficiente», «Lo necesitamos aquí», «Pídelo a otra sucursal» u «Otro») y
 * una nota, que solo es obligatoria con «Otro». Quien la pidió ve el motivo
 * en su aviso y en el detalle. Antes se mandaba siempre el mismo texto
 * («Rechazada desde wizard de transferencias»).
 *
 * Un diálogo como el de «Iniciar conteo semanal»: título en oración, qué
 * pasa al rechazar y la barra con Volver y la acción. El error del servidor
 * sale en la barra.
 */

import ChoiceChips from "@/components/Adjustments/ChoiceChips";
import { FormFooter } from "@/components/Form/FormLayout";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Button } from "react-native-paper";
import {
  composeRejection,
  REJECTION_REASON_MAX,
  REJECTION_REASONS,
  type RejectionChoice,
} from "./transferFormat";

const OPTIONS = REJECTION_REASONS.map((reason) => ({ value: reason, label: reason }));

// Cabe junto al motivo más largo dentro de los 500 del backend.
const NOTE_MAX =
  REJECTION_REASON_MAX - Math.max(...REJECTION_REASONS.map((reason) => reason.length)) - 2;

interface Props {
  visible: boolean;
  /** Quien la pidió: verá el motivo. */
  requesterName?: string | null;
  onClose: () => void;
  /**
   * Manda el rechazo con el motivo armado (composeRejection). Devuelve el
   * mensaje de error para la barra, o null si se rechazó.
   */
  onSubmit: (reason: string) => Promise<string | null>;
}

export default function RejectTransferSheet({ visible, requesterName, onClose, onSubmit }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const narrow = useWindowDimensions().width < 520;
  const [choice, setChoice] = useState<RejectionChoice | null>(null);
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const other = choice === "Otro";
  const choiceError = choice ? null : "Elige un motivo";
  const noteError = other && !note.trim() ? "Escribe el motivo" : null;
  const problem = choiceError ?? noteError;

  // Lo que dice la barra: el error del servidor o, después de intentar, lo que falta.
  const footerNote = serverError ?? (attempted && problem ? `${problem}.` : null);

  const close = () => {
    if (sending) return;
    setChoice(null);
    setNote("");
    setAttempted(false);
    setServerError(null);
    onClose();
  };

  const submit = async () => {
    setAttempted(true);
    setServerError(null);
    if (problem || !choice || sending) return;
    setSending(true);
    try {
      const error = await onSubmit(composeRejection(choice, note));
      if (error) {
        setServerError(error);
      } else {
        setChoice(null);
        setNote("");
        setAttempted(false);
      }
    } finally {
      setSending(false);
    }
  };

  const who = requesterName?.trim() || "Quien la pidió";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.overlay}>
          {/* Tocar fuera cierra (mientras no se esté mandando). */}
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Cerrar" />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.title} accessibilityRole="header">
                  Rechazar solicitud
                </Text>
                <Text style={styles.subtitle}>
                  {`Termina como rechazada y no se mueve inventario. ${who} verá el motivo en su aviso y en la transferencia.`}
                </Text>
              </View>
              <Pressable
                onPress={close}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                disabled={sending}
              >
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.block}>
                <Text style={styles.label}>Motivo</Text>
                <ChoiceChips<RejectionChoice>
                  options={OPTIONS}
                  value={choice}
                  onChange={(value) => {
                    setServerError(null);
                    setChoice(value);
                  }}
                  accessibilityLabel="Motivo del rechazo"
                />
                {attempted && !!choiceError && <Text style={styles.error}>{choiceError}</Text>}
              </View>

              <View style={styles.block}>
                <Text style={styles.label}>{other ? "¿Por qué?" : "Nota (opcional)"}</Text>
                <TextInput
                  value={note}
                  onChangeText={(value) => {
                    setServerError(null);
                    setNote(value);
                  }}
                  placeholder={other ? "Ya no manejamos ese producto" : "Nos llega mercancía el lunes"}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  maxLength={NOTE_MAX}
                  accessibilityLabel={other ? "Por qué la rechazas" : "Nota del rechazo"}
                  style={[styles.input, attempted && !!noteError && styles.inputInvalid]}
                />
                {attempted && !!noteError && <Text style={styles.error}>{noteError}</Text>}
              </View>
            </ScrollView>

            <FormFooter note={footerNote}>
              <Button
                mode="outlined"
                onPress={close}
                disabled={sending}
                compact={narrow}
                style={narrow ? undefined : { flex: 1 }}
              >
                Volver
              </Button>
              <Button
                mode="contained"
                onPress={submit}
                loading={sending}
                disabled={sending}
                buttonColor={colors.error}
                textColor={colors.textInverse}
                compact={narrow}
                style={{ flex: narrow ? 1 : 1.4 }}
              >
                Rechazar solicitud
              </Button>
            </FormFooter>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = themedStyles((c) => ({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  // Fondo de la página: el campo y la barra de abajo se ven como en
  // cualquier formulario.
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    backgroundColor: c.background,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...tokens.typography.h3, color: c.text },
  subtitle: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 4 },
  bodyScroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 18, gap: 18 },
  block: { gap: 8 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.textSecondary },
  input: {
    minHeight: 72,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    textAlignVertical: "top",
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },
  inputInvalid: { borderColor: c.error, backgroundColor: c.errorSoft },
  error: { fontSize: 13, lineHeight: 18, color: c.error },
}));
