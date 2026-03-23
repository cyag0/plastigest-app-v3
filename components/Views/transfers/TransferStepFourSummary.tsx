import palette from "@/constants/palette";
import { resolveImageUri } from "@/utils/imageUtils";
import type { InventoryTransfer } from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import { Card, Chip, Divider, Text } from "react-native-paper";

interface TransferStepFourSummaryProps {
  transfer: InventoryTransfer;
  formatDate: (dateString?: string) => string;
}

function formatQty(value: number | string | undefined) {
  return Number(value || 0).toFixed(3);
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

function getStepPresentation(result: string) {
  if (result === "failed") {
    return {
      icon: "close-circle-outline" as const,
      iconColor: "#B3261E",
      label: "Fallo",
      chipBg: "#FDECEC",
      chipText: "#8E1C15",
      cardBorder: "#F4B4AE",
    };
  }

  if (result === "completed") {
    return {
      icon: "check-circle-outline" as const,
      iconColor: "#2E7D32",
      label: "Completado",
      chipBg: "#EAF5E4",
      chipText: "#31502F",
      cardBorder: "#D7EACC",
    };
  }

  if (result === "skipped") {
    return {
      icon: "skip-next-circle-outline" as const,
      iconColor: "#8A6F42",
      label: "No alcanzado",
      chipBg: "#F8EFE1",
      chipText: "#7A5D2F",
      cardBorder: "#E8D8BC",
    };
  }

  return {
    icon: "clock-outline" as const,
    iconColor: "#6B7280",
    label: "Pendiente",
    chipBg: "#EFF1F4",
    chipText: "#465066",
    cardBorder: "#DDE3EA",
  };
}

export default function TransferStepFourSummary({
  transfer,
  formatDate,
}: TransferStepFourSummaryProps) {
  const details = transfer.details || [];
  const content = transfer.content;
  const progress = content?.progress || {};

  const normalizeEvidence = (files: any[] | undefined, workflowFiles: any[] | undefined) => {
    const fromWorkflow = Array.isArray(workflowFiles) ? workflowFiles : [];
    if (fromWorkflow.length > 0) return fromWorkflow;

    const fromFiles = Array.isArray(files) ? files : [];
    return fromFiles;
  };

  const getProgressResult = (stepKey: "step_1" | "step_2" | "step_3") => {
    const result = progress?.[stepKey]?.result;
    return result || "pending";
  };

  const step1Result = getProgressResult("step_1");
  const step2Result = getProgressResult("step_2");
  const step3Result = getProgressResult("step_3");

  const step2Evidence = normalizeEvidence(
    content?.step_2?.evidence_files,
    (content as any)?.workflow?.step_2?.evidence,
  );
  const step3Evidence = normalizeEvidence(
    content?.step_3?.evidence_files,
    (content as any)?.workflow?.step_3?.evidence,
  );

  const totals = details.reduce(
    (acc, detail: any) => {
      const requested = Number(detail.quantity_requested || 0);
      const shipped = Number(detail.quantity_shipped ?? requested);
      const received = Number(detail.quantity_received ?? shipped);

      return {
        requested: acc.requested + requested,
        shipped: acc.shipped + shipped,
        received: acc.received + received,
      };
    },
    { requested: 0, shipped: 0, received: 0 },
  );

  const rowsWithDifferences = details.filter((detail: any) => {
    const requested = Number(detail.quantity_requested || 0);
    const shipped = Number(detail.quantity_shipped ?? requested);
    const received = Number(detail.quantity_received ?? shipped);
    return shipped !== received;
  });

  const isFinalFailed = String(content?.flow_state || "") === "failed";
  const finalStatusLabel = isFinalFailed ? "Finalizado con fallo" : "Finalizado";
  const generatedAdjustments = Array.isArray(transfer.generated_adjustments)
    ? transfer.generated_adjustments
    : [];

  const endedAtStep = content?.ended_at_step;

  const renderStepCard = ({
    stepNumber,
    title,
    result,
    completedAt,
    list,
    listBuilder,
    evidence,
    noReachedText,
  }: {
    stepNumber: number;
    title: string;
    result: string;
    completedAt?: string;
    list: any[];
    listBuilder: (item: any) => string;
    evidence?: Array<{ uri?: string; url?: string; path?: string; name?: string }>;
    noReachedText: string;
  }) => {
    const visual = getStepPresentation(result);
    const wasReached = result !== "skipped" && result !== "pending";

    return (
      <View
        style={[
          styles.stepCard,
          { borderColor: visual.cardBorder },
          result === "failed" && styles.failedStepCard,
        ]}
      >
        <View style={styles.stepCardHeader}>
          <View style={styles.stepTitleRow}>
            <MaterialCommunityIcons
              name={visual.icon}
              size={18}
              color={visual.iconColor}
            />
            <Text style={styles.stepCardTitle}>
              Paso {stepNumber}: {title}
            </Text>
          </View>

          <Chip
            compact
            style={[styles.stepStateChip, { backgroundColor: visual.chipBg }]}
            textStyle={[styles.stepStateChipText, { color: visual.chipText }]}
          >
            {visual.label}
          </Chip>
        </View>

        {result === "failed" && (
          <Text style={styles.failedText}>
            El procedimiento termino con fallo en este paso.
          </Text>
        )}

        {!wasReached ? (
          <Text style={styles.notReachedText}>{noReachedText}</Text>
        ) : (
          <>
            <Text style={styles.stepDateText}>
              Fecha: {formatDate(completedAt)}
            </Text>

            {list.length === 0 ? (
              <Text style={styles.emptyListText}>Sin registros para este paso.</Text>
            ) : (
              list.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemHeaderRow}>
                    <View style={styles.itemImageBox}>
                      {resolveImageUri(item.product?.main_image) ? (
                        <Image
                          source={{
                            uri: resolveImageUri(item.product?.main_image) || "",
                          }}
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="image-off-outline"
                          size={16}
                          color="#7A7369"
                        />
                      )}
                    </View>

                    <Text style={styles.itemTitle}>
                      {item.product?.name || "Producto"}
                    </Text>
                  </View>
                  <Text style={styles.itemText}>{listBuilder(item)}</Text>
                </View>
              ))
            )}

            {!!evidence?.length && (
              <View style={styles.evidenceBlock}>
                <Text style={styles.evidenceTitle}>Evidencias</Text>
                <View style={styles.evidenceGrid}>
                  {evidence.map((file, index) => (
                    <View
                      key={`${resolveImageUri(file) || file.name || "file"}-${index}`}
                      style={styles.evidenceItem}
                    >
                      {resolveImageUri(file) ? (
                        <Image
                          source={{ uri: resolveImageUri(file) || "" }}
                          style={styles.evidenceImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.evidencePlaceholder}>
                          <MaterialCommunityIcons
                            name="file-image-outline"
                            size={20}
                            color="#6A6258"
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!evidence?.length && (
              <Text style={styles.noEvidenceText}>Sin evidencia cargada en este paso.</Text>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="file-document-check-outline"
            size={22}
            color={palette.success}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Paso 4: Resumen
          </Text>
        </View>

        <Divider style={styles.divider} />

        <Text style={styles.stepHelpText}>
          Esta transferencia esta completada. Aqui puedes revisar el resultado
          final de todos los pasos.
        </Text>

        <View style={styles.infoRowCompact}>
          <Text style={styles.label}>Folio:</Text>
          <Text style={styles.value}>
            {transfer.transfer_number || `#${transfer.id}`}
          </Text>
        </View>

        <View style={styles.infoRowCompact}>
          <Text style={styles.label}>Estatus final:</Text>
          <Chip
            compact
            style={[styles.statusChip, isFinalFailed && styles.statusChipFailed]}
            textStyle={[styles.statusChipText, isFinalFailed && styles.statusChipTextFailed]}
          >
            {transfer.status_label || transfer.status} - {finalStatusLabel}
          </Chip>
        </View>

        {endedAtStep ? (
          <View style={styles.infoRowCompact}>
            <Text style={styles.label}>Termino en:</Text>
            <Text style={[styles.value, endedAtStep < 4 && styles.valueFailed]}>
              Paso {endedAtStep}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRowCompact}>
          <Text style={styles.label}>Origen:</Text>
          <Text style={styles.value}>{transfer.from_location?.name || "N/A"}</Text>
        </View>

        <View style={styles.infoRowCompact}>
          <Text style={styles.label}>Destino:</Text>
          <Text style={styles.value}>{transfer.to_location?.name || "N/A"}</Text>
        </View>

        <View style={styles.timelineBlock}>
          <Text style={styles.timelineTitle}>Linea de tiempo</Text>

          <View style={styles.timelineItem}>
            <MaterialCommunityIcons
              name="numeric-1-circle"
              size={18}
              color={palette.blue}
            />
            <Text style={styles.timelineText}>
              Aprobacion: {formatDate(transfer.approved_at)}
            </Text>
          </View>

          <View style={styles.timelineItem}>
            <MaterialCommunityIcons
              name="numeric-2-circle"
              size={18}
              color={palette.warning}
            />
            <Text style={styles.timelineText}>Envio: {formatDate(transfer.shipped_at)}</Text>
          </View>

          <View style={styles.timelineItem}>
            <MaterialCommunityIcons
              name="numeric-3-circle"
              size={18}
              color={palette.success}
            />
            <Text style={styles.timelineText}>
              Recepcion: {formatDate(transfer.received_at)}
            </Text>
          </View>
        </View>

        <View style={styles.resumeBlock}>
          <Text style={styles.resumeTitle}>Totales</Text>

          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Solicitado</Text>
              <Text style={styles.totalValue}>{formatQty(totals.requested)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Enviado</Text>
              <Text style={styles.totalValue}>{formatQty(totals.shipped)}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Recibido</Text>
              <Text style={styles.totalValue}>{formatQty(totals.received)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.resumeBlock}>
          <Text style={styles.resumeTitle}>Productos con diferencia</Text>

          {rowsWithDifferences.length === 0 ? (
            <Text style={styles.noDifferencesText}>
              No se registraron diferencias en la recepcion.
            </Text>
          ) : (
            rowsWithDifferences.map((detail: any) => {
              const requested = Number(detail.quantity_requested || 0);
              const shipped = Number(detail.quantity_shipped ?? requested);
              const received = Number(detail.quantity_received ?? shipped);
              const unit =
                detail.unit?.abbreviation ||
                detail.product?.unit?.abbreviation ||
                "ud";

              return (
                <View key={detail.id} style={styles.differenceItem}>
                  <Text style={styles.productName}>
                    {detail.product?.name || "Producto"}
                  </Text>
                  <Text style={styles.differenceText}>
                    Enviado: {formatQty(shipped)} {unit} | Recibido: {formatQty(received)} {unit}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.resumeBlock}>
          <Text style={styles.resumeTitle}>Ajustes generados en recepcion</Text>

          {generatedAdjustments.length === 0 ? (
            <Text style={styles.noDifferencesText}>
              No se generaron ajustes durante la recepcion.
            </Text>
          ) : (
            generatedAdjustments.map((adjustment) => {
              const evidenceFiles = Array.isArray(adjustment.content?.evidence_files)
                ? adjustment.content?.evidence_files || []
                : [];
              const reasonBadge = getReasonBadgeStyle(adjustment.reason);

              return (
                <View key={adjustment.id} style={styles.adjustmentCard}>
                  <View style={styles.adjustmentCardHeader}>
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={16}
                      color="#8E1C15"
                    />
                    <Text style={styles.adjustmentCardTitle}>
                      Ajuste #{adjustment.id}
                    </Text>
                  </View>

                  <Text style={styles.adjustmentCardText}>
                    Producto: {adjustment.product_name || "Producto"}
                  </Text>
                  <Text style={styles.adjustmentCardText}>
                    Cantidad: {formatQty(adjustment.quantity)}{" "}
                    {adjustment.unit?.abbreviation || "ud"}
                  </Text>
                  <View style={styles.reasonBadgeRow}>
                    <Text style={styles.adjustmentCardText}>Motivo:</Text>
                    <View
                      style={[
                        styles.reasonBadge,
                        { backgroundColor: reasonBadge.backgroundColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonBadgeText,
                          { color: reasonBadge.text },
                        ]}
                      >
                        {adjustment.reason_label || adjustment.reason || "-"}
                      </Text>
                    </View>
                  </View>
                  {!!adjustment.content?.adjustment_comment && (
                    <Text style={styles.adjustmentCardText}>
                      Que paso: {adjustment.content.adjustment_comment}
                    </Text>
                  )}
                  {!!adjustment.notes && (
                    <Text style={styles.adjustmentCardText}>
                      Nota: {adjustment.notes}
                    </Text>
                  )}
                  <Text style={styles.adjustmentCardText}>
                    Fecha: {formatDate(adjustment.applied_at)}
                  </Text>
                  {evidenceFiles.length > 0 && (
                    <Text style={styles.adjustmentCardText}>
                      Evidencias: {evidenceFiles.length}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>



          {renderStepCard({
            stepNumber: 1,
            title: "Aprobacion",
            result: step1Result,
            completedAt: transfer.approved_at || transfer.requested_at,
            list: details,
            listBuilder: (detail: any) => {
              const unit =
                detail.unit?.abbreviation ||
                detail.product?.unit?.abbreviation ||
                "ud";
              return `Solicitado: ${formatQty(detail.quantity_requested)} ${unit}`;
            },
            noReachedText:
              "El procedimiento ya no llego a este paso. Se cerró antes de la aprobación.",
          })}

          {renderStepCard({
            stepNumber: 2,
            title: "Envio",
            result: step2Result,
            completedAt: transfer.shipped_at,
            list: details,
            listBuilder: (detail: any) => {
              const unit =
                detail.unit?.abbreviation ||
                detail.product?.unit?.abbreviation ||
                "ud";
              return `Enviado: ${formatQty(detail.quantity_shipped ?? 0)} ${unit}`;
            },
            evidence: step2Evidence,
            noReachedText:
              "El procedimiento ya no llego a este paso. Se finalizó antes del envío.",
          })}

          {renderStepCard({
            stepNumber: 3,
            title: "Recepcion",
            result: step3Result,
            completedAt: transfer.received_at,
            list: details,
            listBuilder: (detail: any) => {
              const unit =
                detail.unit?.abbreviation ||
                detail.product?.unit?.abbreviation ||
                "ud";
              return `Recibido: ${formatQty(detail.quantity_received ?? 0)} ${unit}`;
            },
            evidence: step3Evidence,
            noReachedText:
              "El procedimiento ya no llego a este paso. Se cerró en un paso anterior.",
          })}
        
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
  infoRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  label: {
    color: "#6A6258",
    fontWeight: "700",
    minWidth: 95,
  },
  value: {
    color: "#3D372F",
    flex: 1,
  },
  statusChip: {
    backgroundColor: "#EAF5E4",
    height: 30,
  },
  statusChipFailed: {
    backgroundColor: "#FDECEC",
  },
  statusChipText: {
    color: "#31502F",
    fontWeight: "700",
  },
  statusChipTextFailed: {
    color: "#8E1C15",
  },
  valueFailed: {
    color: "#8E1C15",
    fontWeight: "700",
  },
  timelineBlock: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#EFE8DE",
    borderRadius: 12,
    padding: 10,
  },
  timelineTitle: {
    color: "#4E473D",
    fontWeight: "700",
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  timelineText: {
    color: "#4E473D",
  },
  resumeBlock: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#EFE8DE",
    borderRadius: 12,
    padding: 10,
  },
  resumeTitle: {
    color: "#4E473D",
    fontWeight: "700",
    marginBottom: 8,
  },
  totalsRow: {
    flexDirection: "row",
    gap: 8,
  },
  totalItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#F8F6F2",
    borderRadius: 8,
    alignItems: "center",
  },
  totalLabel: {
    color: "#6A6258",
    fontSize: 12,
  },
  totalValue: {
    color: "#3D372F",
    fontWeight: "700",
    marginTop: 4,
  },
  noDifferencesText: {
    color: "#5E5A52",
  },
  differenceItem: {
    borderWidth: 1,
    borderColor: "#EFE8DE",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  productName: {
    color: "#3D372F",
    fontWeight: "700",
  },
  differenceText: {
    color: "#5E5A52",
    marginTop: 2,
    fontSize: 12,
  },
  adjustmentCard: {
    borderWidth: 1,
    borderColor: "#F1B5AF",
    borderRadius: 10,
    backgroundColor: "#FDECEC",
    padding: 10,
    marginBottom: 8,
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
  stepCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
  },
  failedStepCard: {
    backgroundColor: "#FFF8F8",
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  stepCardTitle: {
    color: "#3D372F",
    fontWeight: "700",
    flexShrink: 1,
  },
  stepStateChip: {
    height: 28,
  },
  stepStateChipText: {
    fontWeight: "700",
    fontSize: 11,
  },
  failedText: {
    color: "#8E1C15",
    fontWeight: "700",
    marginTop: 8,
  },
  notReachedText: {
    marginTop: 8,
    color: "#7A5D2F",
    lineHeight: 18,
  },
  stepDateText: {
    marginTop: 8,
    color: "#5E5A52",
    fontSize: 12,
  },
  itemRow: {
    borderWidth: 1,
    borderColor: "#EFE8DE",
    borderRadius: 10,
    padding: 8,
    marginTop: 8,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemImageBox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E3D9CA",
    backgroundColor: "#F7F4EE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemTitle: {
    color: "#3D372F",
    fontWeight: "700",
    flexShrink: 1,
  },
  itemText: {
    color: "#5E5A52",
    marginTop: 2,
    fontSize: 12,
  },
  emptyListText: {
    marginTop: 8,
    color: "#5E5A52",
  },
  evidenceBlock: {
    marginTop: 10,
  },
  evidenceTitle: {
    color: "#4E473D",
    fontWeight: "700",
    marginBottom: 8,
  },
  evidenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  evidenceItem: {
    width: 86,
    height: 86,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E3D9CA",
    backgroundColor: "#FAF7F2",
  },
  evidenceImage: {
    width: "100%",
    height: "100%",
  },
  evidencePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  noEvidenceText: {
    marginTop: 8,
    color: "#6A6258",
    fontSize: 12,
  },
});
