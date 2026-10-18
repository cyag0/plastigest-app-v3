/**
 * Paso 3, recepción: la sucursal destino escribe cuánto llegó en buen estado
 * de cada producto (por omisión, lo enviado). Si llegó menos, dice el motivo
 * (se perdió o llegó dañado), qué pasó y sube al menos una foto: con eso el
 * backend registra un ajuste por la diferencia. La nota y las fotos de la
 * recepción son opcionales. Para los demás es solo lectura.
 *
 * POST receive (multipart): items[{detail_id, quantity_received}] y, en los
 * renglones que llegaron incompletos, adjustment_reason, adjustment_comment,
 * adjustment_notes y adjustment_evidence[]; además receiving_notes y
 * evidence[].
 *
 * Antes cada producto preguntaba «¿Llegó correctamente? Sí / No»; ahora se
 * corrige la cantidad, como en la recepción de Compras. Y una cantidad mayor
 * a la enviada ya no se cambiaba en silencio por la enviada: se avisa.
 */

import ChoiceChips from "@/components/Adjustments/ChoiceChips";
import EmptyState from "@/components/App/EmptyState";
import AppUpload, { type UploadedFile } from "@/components/Form/AppUpload";
import { FormFooter } from "@/components/Form/FormLayout";
import { TransferLayout, TransferProducts } from "@/components/Transfers/TransferDetailParts";
import TransferLineRow, { TransferQuantityInput } from "@/components/Transfers/TransferLineRow";
import {
  captureUnit,
  lineName,
  lineQty,
  lineStages,
  quantityInput,
  readQuantity,
  reasonLabel,
  shortName,
  type TransferLine,
} from "@/components/Transfers/transferFormat";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf } from "@/utils/errorNotice";
import { formatQuantity } from "@/utils/format";
import type { InventoryTransfer, TransferReceiveStepItem } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

type Reason = "loss" | "damage";

const REASON_OPTIONS: { value: Reason; label: string }[] = [
  { value: "loss", label: reasonLabel("loss") },
  { value: "damage", label: reasonLabel("damage") },
];

/** Fotos por producto que llegó incompleto, y de la recepción. */
const MAX_INCIDENT_PHOTOS = 4;
const MAX_PHOTOS = 8;

const EPS = 1e-9;

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

/** Lo que se captura de un renglón. */
interface Draft {
  /** Cuánto llegó, tal como se escribe. */
  text: string;
  reason: Reason | null;
  comment: string;
  notes: string;
  showNotes: boolean;
  photos: UploadedFile[];
}

interface Props {
  transfer: InventoryTransfer;
  header: React.ReactNode;
  intro?: React.ReactNode;
  side: React.ReactNode;
  /** Destino con transfers_update en el paso 3: captura lo que llegó y confirma. */
  canReceive: boolean;
  onCompleted: () => Promise<void>;
}

/** Lo que debió llegar: lo enviado (o lo pedido, si no viene). */
const expectedOf = (line: TransferLine): number =>
  Number(line.quantity_shipped ?? line.quantity_requested ?? (line as any).quantity ?? 0);

export default function TransferStepThreeReceive({ transfer, header, intro, side, canReceive, onCompleted }: Props) {
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { submitting, run } = useSubmitGuard();
  // Guardando (ya confirmado): el botón muestra que se está guardando.
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [receivingNotes, setReceivingNotes] = useState("");
  const [evidence, setEvidence] = useState<UploadedFile[]>([]);

  const lines = useMemo(() => (transfer.details ?? []) as TransferLine[], [transfer.details]);
  const initialDrafts = () =>
    Object.fromEntries(
      lines.map((line) => [
        line.id,
        { text: quantityInput(expectedOf(line)), reason: null, comment: "", notes: "", showNotes: false, photos: [] } as Draft,
      ]),
    );
  // La pantalla monta esta vista con key por transferencia y updated_at: al
  // recargarla, lo capturado vuelve a empezar.
  const [drafts, setDrafts] = useState<Record<number, Draft>>(initialDrafts);

  const update = (lineId: number, patch: Partial<Draft>) => {
    setServerError(null);
    setDrafts((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));
  };

  const rows = lines.map((line) => {
    const expected = expectedOf(line);
    const draft: Draft = drafts[line.id] ?? {
      text: quantityInput(expected),
      reason: null,
      comment: "",
      notes: "",
      showNotes: false,
      photos: [],
    };
    // Lo que no se envió no se captura (el backend lo ignora).
    if (expected <= EPS) {
      return {
        line,
        expected,
        draft,
        received: expected,
        error: null,
        short: false,
        missing: 0,
        problem: null,
        problems: {} as Record<string, string | null>,
      };
    }
    const read = readQuantity(draft.text, "Escribe cuánto llegó (puede ser 0)");
    let error = read.error;
    if (!error && (read.value as number) > expected + EPS) {
      error = `No puede ser más de lo enviado (${lineQty(line, expected)})`;
    }
    const received = error ? null : read.value;
    const short = received !== null && received < expected - EPS;
    const problems: Record<string, string | null> = short
      ? {
          reason: draft.reason ? null : "Elige si se perdió o llegó dañado",
          comment: draft.comment.trim() ? null : "Escribe qué pasó",
          photos: draft.photos.length > 0 ? null : "Sube al menos una foto",
        }
      : {};
    const problem = error ?? problems.reason ?? problems.comment ?? problems.photos ?? null;
    return { line, expected, draft, received, error, short, missing: short ? expected - (received as number) : 0, problem, problems };
  });

  const withProblems = rows.filter((row) => row.problem);
  const shortRows = rows.filter((row) => row.short);

  let note: string | null = serverError;
  if (!note && attempted) {
    if (rows.length === 0) note = "No hay productos para recibir.";
    else if (withProblems.length === 1)
      note = `${shortName(lineName(withProblems[0].line))}: ${lowerFirst(withProblems[0].problem!)}.`;
    else if (withProblems.length > 1) note = `Revisa los ${withProblems.length} productos marcados.`;
  }

  const receiveMessage = () => {
    if (shortRows.length === 0) return "Llegó todo lo enviado: entra al inventario de tu sucursal.";
    const shown = shortRows.slice(0, 6).map(
      (row) =>
        `• ${lineName(row.line)}: ${formatQuantity(row.received)} de ${lineQty(row.line, row.expected)} (${lowerFirst(reasonLabel(row.draft.reason))})`,
    );
    if (shortRows.length > shown.length) shown.push(`• y ${shortRows.length - shown.length} más`);
    return (
      `Llegó menos en ${shortRows.length === 1 ? "un producto" : `${shortRows.length} productos`}:\n${shown.join("\n")}\n\n` +
      "Entra al inventario solo lo que llegó bien. Lo que falta queda registrado como ajuste por pérdida o daño y se crea la tarea de revisar las diferencias."
    );
  };

  const receive = () =>
    run(async () => {
      setAttempted(true);
      setServerError(null);
      if (rows.length === 0 || withProblems.length > 0) return;

      const ok = await alerts.confirm(receiveMessage(), {
        title: "¿Confirmar la recepción?",
        okText: "Confirmar",
        cancelText: "Volver",
      });
      if (!ok) return;

      const payloadItems: TransferReceiveStepItem[] = rows.map((row) => ({
        detail_id: row.line.id,
        quantity_received: Number(row.short ? row.received : row.expected),
        adjustment_reason: row.short ? (row.draft.reason ?? undefined) : undefined,
        adjustment_comment: row.short ? row.draft.comment : undefined,
        adjustment_notes: row.short ? row.draft.notes : undefined,
        adjustment_evidence: row.short ? row.draft.photos : undefined,
      }));

      setSaving(true);
      try {
        await transferService.receive(
          transfer.id,
          { items: payloadItems, receiving_notes: receivingNotes, evidence },
          { silent: true },
        );
        alerts.success(
          shortRows.length > 0
            ? "Recepción registrada con diferencias: entró a tu inventario lo que llegó bien."
            : "Recepción registrada: ya entró a tu inventario.",
        );
        await onCompleted();
      } catch (error) {
        setServerError(errorMessageOf(error, "No se pudo registrar la recepción."));
      } finally {
        setSaving(false);
      }
    });

  const showThumbs = lines.some((line) => !!line.product?.main_image);

  const products = (
    <TransferProducts
      count={lines.length}
      hint={
        canReceive && lines.length > 0
          ? "Escribe cuánto llegó en buen estado de cada producto; por omisión, lo que se envió."
          : null
      }
    >
      {lines.length === 0 ? (
        <EmptyState compact icon="package-variant" title="Sin productos" />
      ) : (
        rows.map((row) => {
          const { line, draft } = row;
          const name = lineName(line);
          const capture = canReceive && row.expected > EPS;
          // Lo escrito mal se ve al escribir; el campo vacío y lo que falta, al confirmar.
          const showError = !!row.error && (attempted || draft.text.trim() !== "");
          const marked = (key: string) => (attempted ? row.problems[key] ?? null : null);
          return (
            <TransferLineRow key={line.id} line={line} thumb={showThumbs} stages={lineStages(transfer, line)}>
              {capture && (
                <>
                  <TransferQuantityInput
                    label="Llegó"
                    value={draft.text}
                    onChangeText={(text) => update(line.id, { text })}
                    unit={captureUnit(line)}
                    invalid={showError}
                    accessibilityLabel={`Cuánto llegó de ${name}`}
                  />
                  {showError ? (
                    <Text style={styles.error}>{row.error}</Text>
                  ) : row.short ? (
                    <Text style={styles.warning}>{`Faltan ${lineQty(line, row.missing)}: se registra como ajuste`}</Text>
                  ) : null}

                  {row.short && (
                    <View style={styles.incident}>
                      <View style={styles.block}>
                        <Text style={styles.question}>Motivo</Text>
                        <ChoiceChips<Reason>
                          options={REASON_OPTIONS}
                          value={draft.reason}
                          onChange={(reason) => update(line.id, { reason })}
                          accessibilityLabel={`Motivo de lo que falta de ${name}`}
                        />
                        {!!marked("reason") && <Text style={styles.error}>{marked("reason")}</Text>}
                      </View>

                      <View style={styles.block}>
                        <Text style={styles.question}>¿Qué pasó?</Text>
                        <TextInput
                          value={draft.comment}
                          onChangeText={(comment) => update(line.id, { comment })}
                          placeholder="Dos cocos llegaron rajados"
                          placeholderTextColor={colors.textMuted}
                          maxLength={500}
                          accessibilityLabel={`Qué pasó con ${name}`}
                          style={[styles.input, !!marked("comment") && styles.inputInvalid]}
                        />
                        {!!marked("comment") && <Text style={styles.error}>{marked("comment")}</Text>}
                      </View>

                      {draft.showNotes && (
                        <View style={styles.block}>
                          <Text style={styles.question}>Nota del ajuste (opcional)</Text>
                          <TextInput
                            value={draft.notes}
                            onChangeText={(notes) => update(line.id, { notes })}
                            placeholder="Se separaron para merma"
                            placeholderTextColor={colors.textMuted}
                            maxLength={500}
                            accessibilityLabel={`Nota del ajuste de ${name}`}
                            style={styles.input}
                          />
                        </View>
                      )}

                      <View style={styles.block}>
                        <Text style={styles.question}>Fotos del faltante o daño</Text>
                        <AppUpload
                          value={draft.photos}
                          onChange={(photos: UploadedFile[]) => update(line.id, { photos })}
                          multiple
                          maxFiles={MAX_INCIDENT_PHOTOS}
                          accept="images"
                          error={!!marked("photos")}
                          helperText={marked("photos") ?? undefined}
                        />
                      </View>

                      {!draft.showNotes && (
                        <Pressable
                          onPress={() => update(line.id, { showNotes: true })}
                          hitSlop={6}
                          style={({ pressed }) => [styles.extra, pressed && { opacity: 0.6 }]}
                          accessibilityRole="button"
                        >
                          <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.primary} />
                          <Text style={styles.extraText}>Agregar nota del ajuste</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              )}
            </TransferLineRow>
          );
        })
      )}
    </TransferProducts>
  );

  const reception = canReceive && lines.length > 0 && (
    <View style={styles.reception}>
      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Nota de la recepción (opcional)</Text>
        <TextInput
          value={receivingNotes}
          onChangeText={(value) => {
            setServerError(null);
            setReceivingNotes(value);
          }}
          placeholder="Llegó en la camioneta de la tarde"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          accessibilityLabel="Nota de la recepción"
          style={[styles.input, styles.inputMultiline]}
        />
      </View>
      <View style={styles.block}>
        <Text style={styles.sectionLabel}>Fotos de la recepción (opcional)</Text>
        <AppUpload
          value={evidence}
          onChange={(files: UploadedFile[]) => {
            setServerError(null);
            setEvidence(files);
          }}
          multiple
          maxFiles={MAX_PHOTOS}
          accept="images"
        />
      </View>
    </View>
  );

  const footer = canReceive ? (
    <FormFooter submitLabel="Confirmar recepción" onSubmit={receive} loading={saving} disabled={submitting} note={note} />
  ) : null;

  return (
    <TransferLayout
      header={header}
      main={
        <>
          {intro}
          {products}
          {reception}
        </>
      }
      side={side}
      footer={footer}
    />
  );
}

const makeStyles = themedStyles((c) => ({
  // Ocre "Strong": el ocre normal no llega a 4.5:1 en letra chica.
  warning: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.warningStrong, marginTop: 6 },
  error: { fontSize: 13, lineHeight: 18, color: c.error, marginTop: 6 },
  incident: { gap: 14, marginTop: 14 },
  block: { gap: 8 },
  reception: { gap: 18 },
  // Como el título de una ListSection: lo de la recepción va fuera de los productos.
  sectionLabel: { fontSize: 14, fontWeight: "600", color: c.textSecondary },
  question: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.textSecondary },
  input: {
    minHeight: 44,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: c.text,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
  },
  inputMultiline: { minHeight: 72, textAlignVertical: "top" },
  inputInvalid: { borderColor: c.error, backgroundColor: c.errorSoft },
  extra: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingVertical: 2 },
  extraText: { fontSize: 14, fontWeight: "600", color: c.primary },
}));
