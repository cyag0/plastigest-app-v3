import AppUpload, { UploadedFile } from "@/components/Form/AppUpload";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import { resolveImageUri } from "@/utils/imageUtils";
import type {
  InventoryTransfer,
  TransferShipStepItem,
} from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";

interface ShipRow {
  detail_id: number;
  product_name: string;
  product_image?: any;
  unit: string;
  quantity_shipped: number;
}

interface TransferStepTwoShipProps {
  transfer: InventoryTransfer;
  canContinueShipInStep2: boolean;
  isRequester: boolean;
  onCompleted: () => Promise<void>;
}

export default function TransferStepTwoShip({
  transfer,
  canContinueShipInStep2,
  isRequester,
  onCompleted,
}: TransferStepTwoShipProps) {
  const alerts = useAlerts();
  const [rows, setRows] = useState<ShipRow[]>([]);
  const [evidence, setEvidence] = useState<UploadedFile[]>([]);
  const [existingEvidenceFiles, setExistingEvidenceFiles] = useState<
    Array<{ name: string; uri: string }>
  >([]);
  const [saving, setSaving] = useState(false);

  const step2Status = String((transfer.content as any)?.step_2?.status || "").toLowerCase();
  const transferStatus = String(transfer.status || "").toLowerCase();
  const isHistoricalStep2 =
    step2Status === "shipped" ||
    transferStatus === "in_transit" ||
    transferStatus === "completed" ||
    transferStatus === "rejected" ||
    transferStatus === "cancelled" ||
    transferStatus === "closed";

  useEffect(() => {
    const mapped: ShipRow[] = (transfer.details || []).map((detail: any) => {
      const approvedQuantity = Number(
        detail.quantity_requested || detail.quantity || 0,
      );
      const shippedQuantity = Number(detail.quantity_shipped ?? 0);

      return {
        detail_id: detail.id,
        product_name: detail.product?.name || "Producto",
        product_image: detail.product?.main_image,
        unit:
          detail.unit?.abbreviation ||
          detail.product?.unit?.abbreviation ||
          "ud",
        quantity_shipped:
          isHistoricalStep2 && shippedQuantity > 0
            ? shippedQuantity
            : approvedQuantity,
      };
    });

    setRows(mapped);
    setEvidence([]);

    // Extract existing evidence files from transfer content with full URIs
    const existingFiles: Array<{ name: string; uri: string }> = [];
    const step2Content = transfer.content as any;
    const filesFromStep = Array.isArray(step2Content?.step_2?.evidence_files)
      ? step2Content.step_2.evidence_files
      : [];
    const filesFromWorkflow = Array.isArray(step2Content?.workflow?.step_2?.evidence)
      ? step2Content.workflow.step_2.evidence
      : [];
    const sourceFiles = filesFromStep.length > 0 ? filesFromStep : filesFromWorkflow;

    if (
      sourceFiles &&
      Array.isArray(sourceFiles)
    ) {
      existingFiles.push(
        ...sourceFiles.map((file: any) => ({
          name: file.name || "archivo",
          uri: file.uri || file.url || file.path || "",
        })),
      );
    }
    setExistingEvidenceFiles(existingFiles);
  }, [transfer.id, transfer.updated_at, isHistoricalStep2]);

  const canSubmit = useMemo(() => {
    return rows.length > 0 && evidence.length > 0;
  }, [rows, evidence]);

  const handleSubmit = async () => {
    if (evidence.length === 0) {
      alerts.error(
        "Debes subir al menos una imagen para confirmar el transporte",
      );
      return;
    }

    const payloadItems: TransferShipStepItem[] = rows.map((row) => ({
      detail_id: row.detail_id,
      quantity_shipped: Number(row.quantity_shipped),
    }));

    try {
      setSaving(true);
      await transferService.ship(transfer.id, {
        items: payloadItems,
        evidence,
      });

      alerts.success("Transporte confirmado correctamente");
      await onCompleted();
    } catch (error: any) {
      alerts.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo confirmar el transporte",
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
            name="truck-delivery-outline"
            size={22}
            color={palette.red}
          />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Paso 2: Envio
          </Text>
        </View>
        <Divider style={styles.divider} />
        <Text style={styles.stepHelpText}>
          {canContinueShipInStep2
            ? "Verifica los productos aprobados y sube imagenes obligatorias como evidencia del transporte."
            : isRequester
              ? "Tu solicitud fue aprobada. Ahora estas esperando que la otra sucursal confirme el transporte de los productos."
              : "Esta etapa la completa la sucursal que envia los productos."}
        </Text>
        {rows.map((row) => (
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
                Cantidad aprobada a enviar: {row.quantity_shipped.toFixed(3)}{" "}
                {row.unit}
              </Text>
            </View>
            </View>
          </View>
        ))}

        {!canContinueShipInStep2 ? (
          <>
            <Text style={styles.stepMutedText}>
              {isRequester
                ? "Modo historial: puedes ver lo que ya se envio, pero no modificarlo."
                : "Modo historial: este paso ya fue procesado y solo esta disponible en lectura."}
            </Text>

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
                    Evidencias de envio ({existingEvidenceFiles.length})
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
                {isHistoricalStep2
                  ? "No se registraron evidencias para este envio."
                  : "Este paso todavia no se procesa y no hay evidencias."}
              </Text>
            )}
          </>
        ) : (
          <>
            <AppUpload
              label="Imagenes de transporte"
              placeholder="Subir fotos del transporte (obligatorio)"
              value={evidence}
              onChange={(files: UploadedFile[]) => setEvidence(files)}
              multiple
              maxFiles={8}
              accept="images"
              helperText="Debes subir al menos una imagen para transferir productos"
            />

            <Button
              mode="contained"
              icon="truck-check-outline"
              onPress={handleSubmit}
              disabled={!canSubmit || saving}
              loading={saving}
              style={[styles.actionButton, styles.shipButton]}
              textColor="#ffffff"
            >
              Transferir productos
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
  existingEvidenceSection: {
    borderWidth: 1,
    borderColor: "#D4E8D4",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
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
  input: {
    marginTop: 10,
    backgroundColor: "#fff",
  },
  actionButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 6,
  },
  shipButton: {
    backgroundColor: palette.red,
  },
});
