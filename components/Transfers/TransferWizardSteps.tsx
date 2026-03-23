import type { VariantMatchMap } from "@/components/App/StatusBadge";
import StatusBadge from "@/components/App/StatusBadge";
import type { InventoryTransfer } from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

interface TransferWizardStatusCardProps {
  transfer: InventoryTransfer;
  selectedStep: number;
  maxStep: number;
  onSelectStep?: (step: number) => void;
}

const STATUS_MATCH: VariantMatchMap = {
  success: ["completed", "closed"],
  warning: ["pending", "ordered"],
  info: ["approved", "in_transit"],
  error: ["rejected", "cancelled"],
};

const STEP_LABELS = ["Aprobación", "Envío", "Recepción", "Resumen"];

export function getCurrentStepFromTransfer(transfer: InventoryTransfer) {
  const status = String(transfer.status || "").toLowerCase();

  if (
    status === "completed" ||
    status === "closed" ||
    status === "rejected" ||
    status === "cancelled"
  ) {
    return 4;
  }

  const fromPayload = Number(transfer.current_step || 0);

  if (fromPayload >= 1 && fromPayload <= 4) {
    return fromPayload;
  }

  if (status === "pending" || status === "ordered") return 1;
  if (status === "approved") return 2;
  if (status === "in_transit") return 3;
  return 3;
}

function getStepTheme(step: number) {
  if (step === 1) {
    return {
      title: "Paso 1: Aprobación",
      subtitle: "Autoriza la solicitud y ajusta cantidades a enviar",
      color: "#D2AB80",
    };
  }

  if (step === 2) {
    return {
      title: "Paso 2: Envío",
      subtitle: "Registra salida de productos y evidencia",
      color: "#A65A4D",
    };
  }

  if (step === 3) {
    return {
      title: "Paso 3: Recepción",
      subtitle: "Confirma recepción y diferencias",
      color: "#809671",
    };
  }

  return {
    title: "Paso 4: Resumen",
    subtitle: "Consulta el resultado final de la transferencia",
    color: "#4B6C8F",
  };
}

export function TransferWizardStatusCard({
  transfer,
  selectedStep,
  maxStep,
  onSelectStep,
}: TransferWizardStatusCardProps) {
  const theme = getStepTheme(selectedStep);

  return (
    <Card style={[styles.statusCard, { backgroundColor: theme.color }]}>
      <Card.Content>
        <View style={styles.statusHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleLarge" style={styles.statusTitle}>
              {theme.title}
            </Text>
            <Text style={styles.statusSubtitle}>{theme.subtitle}</Text>
          </View>
          <StatusBadge
            value={transfer.status}
            label={transfer.status_label || transfer.status}
            match={STATUS_MATCH}
          />
        </View>

        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((step, index) => {
            const isDone = maxStep > step;
            const isCurrent = selectedStep === step;
            const isEnabled = step <= maxStep;

            return (
              <React.Fragment key={`step-${step}`}>
                <Pressable
                  onPress={() => isEnabled && onSelectStep?.(step)}
                  disabled={!isEnabled || !onSelectStep}
                  style={[
                    styles.progressCircle,
                    {
                      backgroundColor: isDone
                        ? "#FFFFFF"
                        : isCurrent
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.38)",
                    },
                    !isEnabled && styles.progressCircleDisabled,
                  ]}
                >
                  {isDone ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={theme.color}
                    />
                  ) : (
                    <Text
                      style={[styles.progressNumber, { color: theme.color }]}
                    >
                      {step}
                    </Text>
                  )}
                </Pressable>

                {index < 3 && (
                  <View
                    style={[
                      styles.progressConnector,
                      {
                        backgroundColor:
                          maxStep > step
                            ? "rgba(255, 255, 255, 0.95)"
                            : "rgba(255, 255, 255, 0.35)",
                      },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        <View style={styles.progressLegendRow}>
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            const enabled = step <= maxStep;

            return (
              <Pressable
                key={label}
                onPress={() => enabled && onSelectStep?.(step)}
                disabled={!onSelectStep || !enabled}
                style={styles.progressLegendPressable}
              >
                <Text
                  style={[
                    styles.progressLegendText,
                    !enabled && styles.disabledLegend,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    borderRadius: 16,
    borderWidth: 0,
    borderColor: "transparent",
    elevation: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statusSubtitle: {
    marginTop: 4,
    color: "rgba(255, 255, 255, 0.92)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },
  progressCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleDisabled: {
    opacity: 0.45,
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressConnector: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    marginHorizontal: 6,
  },
  progressLegendRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLegendPressable: {
    alignItems: "center",
  },
  progressLegendText: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 11,
    fontWeight: "600",
  },
  disabledLegend: {
    opacity: 0.5,
  },
});
