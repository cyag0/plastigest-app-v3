import AppUpload, { UploadedFile } from "@/components/Form/AppUpload";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { resolveImageUri } from "@/utils/imageUtils";
import type {
  TransferGeneratedAdjustment,
  InventoryTransfer,
  TransferReceiveStepItem,
} from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text, TextInput } from "react-native-paper";

interface ReceiveRow {
  detail_id: number;
  product_name: string;
  product_image?: any;
  unit: string;
  expected: number;
  quantity_received: number;
  arrived_ok: boolean;
  adjustment_reason?: "loss" | "damage";
  adjustment_comment?: string;
  adjustment_notes?: string;
  adjustment_evidence: UploadedFile[];
  adjustment_id?: number;
}

interface TransferStepThreeReceiveProps {
  transfer: InventoryTransfer;
  canContinueReceiveInStep3: boolean;
  isRequester: boolean;
  onCompleted: () => Promise<void>;
}

function formatQty(value: number | string | undefined) {
  return Number(value || 0).toFixed(3);
}

function getReasonLabel(reason?: string) {
  if (reason === "loss") return "Extravio";
  if (reason === "damage") return "Dano";
  return "-";
}

function getReasonBadgeStyle(reason?: string) {
  if (reason === "loss") {
    return {
      backgroundColor: "#B3261E",
      text: "#FFFFFF",
    };
  }

  if (reason === "damage") {
    return {
      backgroundColor: "#B45309",
      text: "#FFFFFF",
    };
  }

  return {
    backgroundColor: "#6B7280",
    text: "#FFFFFF",
  };
}

export default function TransferStepThreeReceive({
  transfer,
  canContinueReceiveInStep3,
  isRequester,
  onCompleted,
}: TransferStepThreeReceiveProps) {
  const alerts = useAlerts();
  const [rows, setRows] = useState<ReceiveRow[]>([]);
  const [receivingNotes, setReceivingNotes] = useState("");
  const [evidence, setEvidence] = useState<UploadedFile[]>([]);
  const [existingEvidenceFiles, setExistingEvidenceFiles] = useState<
    Array<{ name: string; uri: string }>
  >([]);
  const [saving, setSaving] = useState(false);

  const generatedAdjustments = useMemo<TransferGeneratedAdjustment[]>(
    () =>
      Array.isArray((transfer as any)?.generated_adjustments)
        ? ((transfer as any).generated_adjustments as TransferGeneratedAdjustment[])
        : [],
    [transfer],
  );

  const generatedAdjustmentById = useMemo(
    () =>
      new Map<number, TransferGeneratedAdjustment>(
        generatedAdjustments
          .filter((item) => Number(item?.id) > 0)
          .map((item) => [Number(item.id), item]),
      ),
    [generatedAdjustments],
  );

  const step3Status = String((transfer.content as any)?.step_3?.status || "").toLowerCase();
  const transferStatus = String(transfer.status || "").toLowerCase();
  const isHistoricalStep3 =
    step3Status === "received" ||
    transferStatus === "completed" ||
    transferStatus === "rejected" ||
    transferStatus === "cancelled" ||
    transferStatus === "closed";

  useEffect(() => {
    const workflowStep3Items = Array.isArray((transfer.content as any)?.workflow?.step_3?.items)
      ? (transfer.content as any).workflow.step_3.items
      : [];

    const mapped: ReceiveRow[] = (transfer.details || []).map((detail: any) => {
      const expected = Number(
        detail.quantity_shipped ??
          detail.quantity_requested ??
          detail.quantity ??
          0,
      );
      const receivedFromPayload = Number(detail.quantity_received ?? expected);
      const isHistoricalRow = isHistoricalStep3 && Number(detail.quantity_shipped ?? 0) > 0;

      const step3Item = workflowStep3Items.find(
        (item: any) => Number(item?.detail_id) === Number(detail.id),
      );

      return {
        detail_id: detail.id,
        product_name: detail.product?.name || "Producto",
        product_image: detail.product?.main_image,
        unit:
          detail.unit?.abbreviation ||
          detail.product?.unit?.abbreviation ||
          "ud",
        expected,
        quantity_received: isHistoricalRow ? receivedFromPayload : expected,
        arrived_ok: isHistoricalRow ? receivedFromPayload >= expected : true,
        adjustment_reason: isHistoricalRow
          ? ((detail.adjustment_reason as "loss" | "damage" | undefined) ?? undefined)
          : undefined,
        adjustment_comment: isHistoricalRow
          ? String(step3Item?.adjustment_comment || "")
          : "",
        adjustment_notes: isHistoricalRow
          ? String(detail.adjustment_notes || detail.damage_report || "")
          : "",
        adjustment_evidence: [],
        adjustment_id: step3Item?.adjustment_id
          ? Number(step3Item.adjustment_id)
          : undefined,
      };
    });

    setRows(mapped);
    setEvidence([]);
    setReceivingNotes("");

    const existingFiles: Array<{ name: string; uri: string }> = [];
    const step3Content = transfer.content as any;
    const filesFromStep = Array.isArray(step3Content?.step_3?.evidence_files)
      ? step3Content.step_3.evidence_files
      : [];
    const filesFromWorkflow = Array.isArray(step3Content?.workflow?.step_3?.evidence)
      ? step3Content.workflow.step_3.evidence
      : [];
    const sourceFiles = filesFromWorkflow.length > 0 ? filesFromWorkflow : filesFromStep;

    if (Array.isArray(sourceFiles)) {
      existingFiles.push(
        ...sourceFiles.map((file: any) => ({
          name: file.name || "archivo",
          uri: file.uri || file.url || file.path || "",
        })),
      );
    }
    setExistingEvidenceFiles(existingFiles);
  }, [transfer.id, transfer.updated_at, isHistoricalStep3]);

  const hasAnyProductNotArrived = useMemo(
    () => rows.some((row) => !row.arrived_ok),
    [rows],
  );

  const canSubmit = useMemo(() => {
    if (!rows.length) return false;

    return rows.every((row) => {
      if (row.arrived_ok) return true;

      return (
        row.quantity_received >= 0 &&
        row.quantity_received < row.expected &&
        !!row.adjustment_reason &&
        !!String(row.adjustment_comment || "").trim() &&
        row.adjustment_evidence.length > 0
      );
    });
  }, [rows, evidence, hasAnyProductNotArrived]);

  const updateRow = (detailId: number, patch: Partial<ReceiveRow>) => {
    setRows((prev) =>
      prev.map((row) =>
        row.detail_id === detailId ? { ...row, ...patch } : row,
      ),
    );
  };

  const handleSubmit = async () => {
    for (const row of rows) {
      if (row.arrived_ok) {
        continue;
      }

      if (row.quantity_received < 0) {
        alerts.error("Las cantidades no pueden ser negativas");
        return;
      }
      if (row.quantity_received > row.expected) {
        alerts.error(
          `La cantidad recibida de ${row.product_name} no puede superar la esperada`,
        );
        return;
      }
      if (row.quantity_received < row.expected && !row.adjustment_reason) {
        alerts.error(
          `Debes indicar si el faltante de ${row.product_name} fue por extravio o dano`,
        );
        return;
      }

      if (row.quantity_received < row.expected && !String(row.adjustment_comment || "").trim()) {
        alerts.error(`Debes describir que paso con ${row.product_name}`);
        return;
      }

      if (row.quantity_received < row.expected && row.adjustment_evidence.length === 0) {
        alerts.error(`Debes subir evidencia para ${row.product_name}`);
        return;
      }

      if (row.quantity_received >= row.expected) {
        alerts.error(
          `Si marcas NO para ${row.product_name}, la cantidad recibida debe ser menor a la esperada`,
        );
        return;
      }
    }

    const payloadItems: TransferReceiveStepItem[] = rows.map((row) => ({
      detail_id: row.detail_id,
      quantity_received: Number(
        row.arrived_ok ? row.expected : row.quantity_received,
      ),
      adjustment_reason:
        !row.arrived_ok && row.quantity_received < row.expected
          ? row.adjustment_reason
          : undefined,
      adjustment_comment:
        !row.arrived_ok && row.quantity_received < row.expected
          ? row.adjustment_comment
          : undefined,
      adjustment_notes:
        !row.arrived_ok && row.quantity_received < row.expected
          ? row.adjustment_notes
          : undefined,
      adjustment_evidence:
        !row.arrived_ok && row.quantity_received < row.expected
          ? row.adjustment_evidence
          : undefined,
    }));

    try {
      setSaving(true);
      await transferService.receive(transfer.id, {
        items: payloadItems,
        receiving_notes: receivingNotes,
        evidence,
      });

      alerts.success("Recepcion confirmada correctamente");
      await onCompleted();
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo confirmar la recepcion",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="archive-check-outline"
            size={22}
            color={palette.success}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Paso 3: Recepcion
          </Text>
        </View>

        <Divider style={styles.divider} />

        <Text style={styles.stepHelpText}>
          {canContinueReceiveInStep3
            ? "Debes confirmar la recepcion y registrar diferencias si existe faltante o dano."
            : isRequester
              ? "El pedido ya va en camino. Estas esperando que la sucursal destino confirme la recepcion."
              : "Esta etapa la completa la sucursal que recibe la transferencia."}
        </Text>

        {!canContinueReceiveInStep3 && (
          <Text style={styles.stepMutedText}>
            {isRequester
              ? "Modo historial: puedes ver el resultado de la recepcion, sin modificar datos."
              : "Modo historial: este paso ya fue procesado y solo esta disponible en lectura."}
          </Text>
        )}

        {rows.map((row) => {
          const hasDifference = !row.arrived_ok;
          const differenceQty = Math.max(row.expected - row.quantity_received, 0);
          const generatedAdjustment = row.adjustment_id
            ? generatedAdjustmentById.get(Number(row.adjustment_id))
            : undefined;
          const rowReasonBadge = getReasonBadgeStyle(row.adjustment_reason);
          const generatedReasonBadge = getReasonBadgeStyle(generatedAdjustment?.reason);
          const generatedAdjustmentEvidence = Array.isArray(
            generatedAdjustment?.content?.evidence_files,
          )
            ? generatedAdjustment?.content?.evidence_files || []
            : [];

          return (
            <View key={row.detail_id} style={styles.productRow}>
              <View style={styles.productMainRow}>
                <View style={styles.productImageBox}>
                  {resolveImageUri(row.product_image) ? (
                    <Image
                      source={{ uri: resolveImageUri(row.product_image) || "" }}
                      style={styles.productImage}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="image-off-outline"
                      size={18}
                      color="#7A7369"
                    />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{row.product_name}</Text>
                  <Text style={styles.productMeta}>
                    Debio llegar: {row.expected.toFixed(3)} {row.unit}
                  </Text>
                </View>
              </View>

              {canContinueReceiveInStep3 ? (
                <>
                  <View style={styles.checklistBlock}>
                    <Text style={styles.checklistLabel}>
                      Llego correctamente?
                    </Text>
                    <View style={styles.checklistRow}>
                      <Button
                        mode={row.arrived_ok ? "contained" : "outlined"}
                        onPress={() =>
                          updateRow(row.detail_id, {
                            arrived_ok: true,
                            quantity_received: row.expected,
                            adjustment_reason: undefined,
                            adjustment_notes: "",
                          })
                        }
                        style={styles.checklistButton}
                      >
                        Si
                      </Button>
                      <Button
                        mode={!row.arrived_ok ? "contained" : "outlined"}
                        onPress={() =>
                          updateRow(row.detail_id, {
                            arrived_ok: false,
                            quantity_received:
                              row.quantity_received >= row.expected
                                ? Math.max(row.expected - 1, 0)
                                : row.quantity_received,
                          })
                        }
                        style={styles.checklistButton}
                      >
                        No
                      </Button>
                    </View>
                  </View>

                  {!row.arrived_ok ? (
                    <TextInput
                      label="Cantidad recibida"
                      mode="outlined"
                      keyboardType="numeric"
                      value={String(row.quantity_received)}
                      onChangeText={(value) =>
                        updateRow(row.detail_id, {
                          quantity_received: Number(value || 0),
                        })
                      }
                      style={styles.input}
                    />
                  ) : (
                    <Text style={styles.okHintText}>
                      Se registrara recepcion completa:{" "}
                      {row.expected.toFixed(3)} {row.unit}
                    </Text>
                  )}

                  {hasDifference && (
                    <>
                      <Text style={styles.adjustmentTitle}>
                        Motivo del ajuste
                      </Text>
                      <View style={styles.reasonRow}>
                        <Button
                          mode={
                            row.adjustment_reason === "loss"
                              ? "contained"
                              : "outlined"
                          }
                          onPress={() =>
                            updateRow(row.detail_id, {
                              adjustment_reason: "loss",
                            })
                          }
                          style={styles.reasonButton}
                        >
                          Extravio
                        </Button>
                        <Button
                          mode={
                            row.adjustment_reason === "damage"
                              ? "contained"
                              : "outlined"
                          }
                          onPress={() =>
                            updateRow(row.detail_id, {
                              adjustment_reason: "damage",
                            })
                          }
                          style={styles.reasonButton}
                        >
                          Dano
                        </Button>
                      </View>

                      <TextInput
                        label="Que paso?"
                        mode="outlined"
                        value={row.adjustment_comment}
                        onChangeText={(value) =>
                          updateRow(row.detail_id, { adjustment_comment: value })
                        }
                        style={styles.input}
                      />

                      <TextInput
                        label="Notas del ajuste"
                        mode="outlined"
                        value={row.adjustment_notes}
                        onChangeText={(value) =>
                          updateRow(row.detail_id, { adjustment_notes: value })
                        }
                        style={styles.input}
                      />

                      <AppUpload
                        label="Evidencia del incidente"
                        placeholder="Subir imagenes del faltante o dano"
                        value={row.adjustment_evidence}
                        onChange={(files: UploadedFile[]) =>
                          updateRow(row.detail_id, { adjustment_evidence: files })
                        }
                        multiple
                        maxFiles={4}
                        accept="images"
                        helperText="Obligatorio cuando el producto no llega correctamente"
                      />

                      <View style={styles.adjustmentCard}>
                        <View style={styles.adjustmentCardHeader}>
                          <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={16}
                            color="#8E1C15"
                          />
                          <Text style={styles.adjustmentCardTitle}>Ajuste a generar</Text>
                        </View>

                        <Text style={styles.adjustmentCardText}>
                          Producto: {row.product_name}
                        </Text>
                        <Text style={styles.adjustmentCardText}>
                          Cantidad: {formatQty(differenceQty)} {row.unit}
                        </Text>
                        <View style={styles.reasonBadgeRow}>
                          <Text style={styles.adjustmentCardText}>Motivo:</Text>
                          <View
                            style={[
                              styles.reasonBadge,
                              { backgroundColor: rowReasonBadge.backgroundColor },
                            ]}
                          >
                            <Text
                              style={[
                                styles.reasonBadgeText,
                                { color: rowReasonBadge.text },
                              ]}
                            >
                              {getReasonLabel(row.adjustment_reason)}
                            </Text>
                          </View>
                        </View>
                        {!!String(row.adjustment_comment || "").trim() && (
                          <Text style={styles.adjustmentCardText}>
                            Que paso: {row.adjustment_comment}
                          </Text>
                        )}
                        {!!String(row.adjustment_notes || "").trim() && (
                          <Text style={styles.adjustmentCardText}>
                            Nota: {row.adjustment_notes}
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.readOnlyInfoBlock}>
                  {!!row.adjustment_id && (
                    <Text style={styles.readOnlyInfoText}>
                      Ajuste ID: #{row.adjustment_id}
                    </Text>
                  )}
                  <Text style={styles.readOnlyInfoText}>
                    Recibido: {row.quantity_received.toFixed(3)} {row.unit}
                  </Text>
                  {hasDifference && (
                    <Text style={styles.readOnlyInfoText}>
                      Diferencia: {(row.expected - row.quantity_received).toFixed(3)} {row.unit}
                    </Text>
                  )}
                  {!!row.adjustment_reason && (
                    <Text style={styles.readOnlyInfoText}>
                      Motivo: {row.adjustment_reason === "loss" ? "Extravio" : "Dano"}
                    </Text>
                  )}
                  {!!row.adjustment_comment && (
                    <Text style={styles.readOnlyInfoText}>
                      Que paso: {row.adjustment_comment}
                    </Text>
                  )}
                  {!!row.adjustment_notes && (
                    <Text style={styles.readOnlyInfoText}>
                      Nota: {row.adjustment_notes}
                    </Text>
                  )}

                  {!!generatedAdjustment && (
                    <View style={styles.adjustmentCard}>
                      <View style={styles.adjustmentCardHeader}>
                        <MaterialCommunityIcons
                          name="alert-circle-outline"
                          size={16}
                          color="#8E1C15"
                        />
                        <Text style={styles.adjustmentCardTitle}>
                          Ajuste generado #{generatedAdjustment.id}
                        </Text>
                      </View>

                      <Text style={styles.adjustmentCardText}>
                        Producto: {generatedAdjustment.product_name || row.product_name}
                      </Text>
                      <Text style={styles.adjustmentCardText}>
                        Cantidad: {formatQty(generatedAdjustment.quantity)}{" "}
                        {generatedAdjustment.unit?.abbreviation || row.unit}
                      </Text>
                      <View style={styles.reasonBadgeRow}>
                        <Text style={styles.adjustmentCardText}>Motivo:</Text>
                        <View
                          style={[
                            styles.reasonBadge,
                            { backgroundColor: generatedReasonBadge.backgroundColor },
                          ]}
                        >
                          <Text
                            style={[
                              styles.reasonBadgeText,
                              { color: generatedReasonBadge.text },
                            ]}
                          >
                            {generatedAdjustment.reason_label ||
                              getReasonLabel(generatedAdjustment.reason)}
                          </Text>
                        </View>
                      </View>
                      {!!generatedAdjustment.content?.adjustment_comment && (
                        <Text style={styles.adjustmentCardText}>
                          Que paso: {generatedAdjustment.content.adjustment_comment}
                        </Text>
                      )}
                      {!!generatedAdjustment.notes && (
                        <Text style={styles.adjustmentCardText}>
                          Nota: {generatedAdjustment.notes}
                        </Text>
                      )}
                      {generatedAdjustmentEvidence.length > 0 && (
                        <Text style={styles.adjustmentCardText}>
                          Evidencias: {generatedAdjustmentEvidence.length}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {!canContinueReceiveInStep3 && (
          <>
            {existingEvidenceFiles.length > 0 ? (
              <View style={styles.existingEvidenceSection}>
                <View style={styles.existingEvidenceHeader}>
                  <MaterialCommunityIcons
                    name="file-check-outline"
                    size={18}
                    color={palette.success}
                  />
                  <Text
                    variant="labelMedium"
                    style={styles.existingEvidenceTitle}
                  >
                    Evidencias de recepcion ({existingEvidenceFiles.length})
                  </Text>
                </View>

                <View style={styles.evidenceGrid}>
                  {existingEvidenceFiles.map((item, index) => (
                    <View key={`${item.uri}-${index}`} style={styles.evidenceItem}>
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.evidenceImage}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={styles.stepMutedText}>
                {isHistoricalStep3
                  ? "No se registraron evidencias de recepcion."
                  : "Este paso todavia no se procesa y no hay evidencias."}
              </Text>
            )}
          </>
        )}

        {canContinueReceiveInStep3 && (
          <>
            <TextInput
              label="Notas generales de recepcion"
              mode="outlined"
              value={receivingNotes}
              onChangeText={setReceivingNotes}
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <AppUpload
              label="Evidencia de recepcion"
              placeholder="Subir imagenes de recepcion"
              value={evidence}
              onChange={(files: UploadedFile[]) => setEvidence(files)}
              multiple
              maxFiles={8}
              accept="images"
              helperText={
                hasAnyProductNotArrived
                  ? "Obligatorio: sube evidencia porque hay productos marcados en NO"
                  : "Opcional si todos los productos llegaron correctamente"
              }
            />

            <Button
              mode="contained"
              icon="check-circle-outline"
              onPress={handleSubmit}
              disabled={!canSubmit || saving}
              loading={saving}
              style={[styles.actionButton, styles.receiveButton]}
              textColor="#ffffff"
            >
              Confirmar recepcion
            </Button>
          </>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E8E0D4",
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#4E473D",
    fontWeight: "700",
  },
  divider: {
    marginVertical: 12,
    backgroundColor: "#ECE4D8",
  },
  stepHelpText: {
    color: "#4E473D",
    marginBottom: 14,
    lineHeight: 20,
  },
  stepMutedText: {
    color: "#7A7369",
    lineHeight: 20,
    marginBottom: 8,
  },
  productRow: {
    borderWidth: 1,
    borderColor: "#EFE8DE",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  productMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  productImageBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E3D9CA",
    backgroundColor: "#F7F4EE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productName: {
    color: "#3D372F",
    fontWeight: "700",
    fontSize: 14,
  },
  productMeta: {
    color: "#6A6258",
    fontSize: 12,
    marginTop: 2,
  },
  checklistBlock: {
    marginTop: 10,
    backgroundColor: "#F9F8F6",
    borderRadius: 10,
    padding: 8,
  },
  checklistLabel: {
    color: "#4E473D",
    fontWeight: "700",
    fontSize: 12,
  },
  checklistRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  checklistButton: {
    flex: 1,
  },
  okHintText: {
    marginTop: 10,
    color: "#4D6141",
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    marginTop: 10,
    backgroundColor: "#fff",
  },
  adjustmentTitle: {
    marginTop: 10,
    color: "#4E473D",
    fontWeight: "700",
  },
  reasonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  reasonButton: {
    flex: 1,
  },
  actionButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 6,
  },
  receiveButton: {
    backgroundColor: palette.success,
  },
  readOnlyInfoBlock: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: "#F9F8F6",
    padding: 8,
    gap: 4,
  },
  readOnlyInfoText: {
    color: "#5E5A52",
    fontSize: 12,
  },
  adjustmentCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#F1B5AF",
    borderRadius: 10,
    backgroundColor: "#FDECEC",
    padding: 10,
    gap: 4,
  },
  adjustmentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  adjustmentCardTitle: {
    color: "#8E1C15",
    fontWeight: "700",
    fontSize: 12,
  },
  adjustmentCardText: {
    color: "#7D2119",
    fontSize: 12,
    lineHeight: 18,
  },
  reasonBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reasonBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  reasonBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  existingEvidenceSection: {
    borderWidth: 1,
    borderColor: "#D4E8D4",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    backgroundColor: "#F5FBF5",
  },
  existingEvidenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  existingEvidenceTitle: {
    color: "#2B7A2B",
    fontWeight: "600",
  },
  evidenceGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  evidenceItem: {
    width: 96,
    height: 96,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8F0E8",
    backgroundColor: "#FFFFFF",
  },
  evidenceImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8E0D4",
  },
});
