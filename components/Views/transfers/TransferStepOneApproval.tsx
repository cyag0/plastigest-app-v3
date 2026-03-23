import palette from "@/constants/palette";
import { resolveImageUri } from "@/utils/imageUtils";
import type { InventoryTransfer } from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  Text,
  TextInput,
} from "react-native-paper";

interface TransferStepOneApprovalProps {
  transfer: InventoryTransfer;
  canApproveInStep1: boolean;
  canEditQuantitiesInStep1: boolean;
  isRequester: boolean;
  editableQuantities: Record<number, number>;
  submitting: boolean;
  onChangeQuantity: (detailId: number, value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  formatDate: (dateString?: string) => string;
}

export default function TransferStepOneApproval({
  transfer,
  canApproveInStep1,
  canEditQuantitiesInStep1,
  isRequester,
  editableQuantities,
  submitting,
  onChangeQuantity,
  onApprove,
  onReject,
  formatDate,
}: TransferStepOneApprovalProps) {
  return (
    <>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="check-decagram-outline"
              size={22}
              color={palette.blue}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Paso 1: Aprobacion
            </Text>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.stepHelpText}>
            {canApproveInStep1
              ? "Debes revisar los productos solicitados, ajustar cantidades si hace falta y confirmar la aprobacion o rechazo."
              : isRequester
                ? "Tu solicitud esta en revision. Espera a que la otra sucursal confirme si aprueba o rechaza esta transferencia."
                : "Esta etapa esta en revision por el responsable de la sucursal origen."}
          </Text>

          <View style={styles.infoRowCompact}>
            <Text style={styles.label}>Folio:</Text>
            <Text style={styles.value}>
              {transfer.transfer_number || `#${transfer.id}`}
            </Text>
          </View>

          <View style={styles.infoRowCompact}>
            <Text style={styles.label}>Solicitado por:</Text>
            <Text style={styles.value}>
              {transfer.requested_by_user?.name || "N/A"}
            </Text>
          </View>

          <View style={styles.infoRowWithBadges}>
            <Text style={styles.label}>Origen:</Text>

            <Chip
              style={[styles.badge, styles.badgeSender]}
              textStyle={styles.badgeText}
              icon="arrow-right-bold"
              onPress={() => {}}
            >
              {transfer.from_location?.name || "N/A"}
            </Chip>
          </View>

          <View style={styles.infoRowWithBadges}>
            <Text style={styles.label}>Destino:</Text>
            <Chip
              style={[styles.badge, styles.badgeReceiver]}
              textStyle={styles.badgeText}
              icon="arrow-left-bold"
              onPress={() => {}}
            >
              {transfer.to_location?.name || "N/A"}
            </Chip>
          </View>
          <View style={styles.infoRowCompact}>
            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>
              {formatDate(transfer.requested_at || transfer.created_at)}
            </Text>
          </View>

          {!!transfer.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notas</Text>
              <Text style={styles.notesValue}>{transfer.notes}</Text>
            </View>
          )}

          {!!transfer.rejection_reason && (
            <View style={styles.rejectionBlock}>
              <Text style={styles.rejectionLabel}>Motivo de rechazo</Text>
              <Text style={styles.rejectionValue}>
                {transfer.rejection_reason}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={22}
              color={palette.warning}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Productos Solicitados
            </Text>
          </View>

          <Divider style={styles.divider} />

          {(transfer.details || []).length === 0 ? (
            <Text style={styles.emptyText}>
              No hay productos en esta transferencia
            </Text>
          ) : (
            (transfer.details || []).map((detail, index) => (
              <View key={detail.id || index} style={styles.productRow}>
                <View style={styles.productMainRow}>
                  <View style={styles.productImageBox}>
                    {resolveImageUri((detail as any).product?.main_image) ? (
                      <Image
                        source={{
                          uri: resolveImageUri((detail as any).product?.main_image) || "",
                        }}
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
                  <Text style={styles.productName}>
                    {detail.product?.name || "Producto"}
                  </Text>
                  <Text style={styles.productCode}>
                    Codigo: {detail.product?.code || "N/A"}
                  </Text>

                  {canEditQuantitiesInStep1 ? (
                    <TextInput
                      mode="outlined"
                      label="Cantidad a enviar"
                      keyboardType="numeric"
                      value={String(
                        editableQuantities[detail.id] ??
                          Number(detail.quantity_requested || 0),
                      )}
                      onChangeText={(value) =>
                        onChangeQuantity(detail.id, value)
                      }
                      style={styles.qtyInput}
                    />
                  ) : (
                    <Text style={styles.readOnlyHint}>Solo lectura</Text>
                  )}
                </View>
                </View>

                <View style={styles.qtyPill}>
                  <Text style={styles.qtyText}>
                    {Number(
                      (editableQuantities[detail.id] ??
                        detail.quantity_requested) ||
                        0,
                    ).toFixed(3)}{" "}
                    {(detail as any).unit?.abbreviation || "ud"}
                  </Text>
                </View>
              </View>
            ))
          )}

          {!canApproveInStep1 && (
            <Text style={styles.stepMutedText}>
              {isRequester
                ? "Cuando la otra sucursal confirme esta etapa, podras dar seguimiento al avance del envio."
                : "Esta pantalla es informativa para tu perfil. Solo quien aprueba en la sucursal origen puede editar cantidades y decidir."}
            </Text>
          )}

          {canApproveInStep1 && (
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="check-bold"
                onPress={onApprove}
                loading={submitting}
                disabled={submitting}
                style={[styles.actionButton, styles.approveButton]}
                textColor="#ffffff"
              >
                Aceptar
              </Button>

              <Button
                mode="contained"
                icon="close-thick"
                onPress={onReject}
                loading={submitting}
                disabled={submitting}
                style={[styles.actionButton, styles.rejectButton]}
                textColor="#ffffff"
              >
                Rechazar
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </>
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
  infoRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    gap: 10,
  },
  infoRowWithBadges: {
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9F8F6",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: palette.primary,
  },
  badge: {
    marginTop: 8,
  },
  badgeSender: {
    backgroundColor: "#E3F2FD",
  },
  badgeReceiver: {
    backgroundColor: "#F3E5F5",
  },
  badgeText: {
    color: "#333",
    fontWeight: "600", 
    fontSize: 12,
  },
  label: {
    color: "#6A6258",
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    color: "#3D372F",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  notesBlock: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F7F4EE",
  },
  notesLabel: {
    color: "#6A6258",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  notesValue: {
    color: "#4E473D",
  },
  rejectionBlock: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#F7E7E4",
    borderWidth: 1,
    borderColor: "#E4B4AC",
  },
  rejectionLabel: {
    color: palette.red,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  rejectionValue: {
    color: "#7A3E35",
  },
  emptyText: {
    color: "#6A6258",
    textAlign: "center",
    paddingVertical: 8,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE8DE",
    gap: 10,
  },
  productMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
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
  productCode: {
    color: "#6A6258",
    fontSize: 12,
    marginTop: 2,
  },
  qtyInput: {
    marginTop: 8,
    backgroundColor: "#fff",
  },
  readOnlyHint: {
    marginTop: 8,
    color: "#7A7369",
    fontSize: 12,
  },
  qtyPill: {
    backgroundColor: "#E9F0E5",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  qtyText: {
    color: "#4D6141",
    fontWeight: "700",
    fontSize: 12,
  },
  stepHelpText: {
    color: "#4E473D",
    marginBottom: 14,
    lineHeight: 20,
  },
  stepMutedText: {
    color: "#7A7369",
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 6,
  },
  approveButton: {
    backgroundColor: palette.success,
  },
  rejectButton: {
    backgroundColor: palette.red,
  },
});
