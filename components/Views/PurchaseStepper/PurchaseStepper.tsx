import palette from "@/constants/palette";
import PurchaseService from "@/utils/services/purchaseService";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface PurchaseStatus {
  value: string;
  label: string;
  description: string;
  icon: string;
}

interface PurchaseStepperProps {
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  readonly?: boolean;
}

const PURCHASE_STEPS: PurchaseStatus[] = [
  {
    value: "draft",
    label: "Borrador",
    description: "Compra en borrador, puede editarse",
    icon: "📝",
  },
  {
    value: "ordered",
    label: "Pedido",
    description: "Pedido enviado al proveedor",
    icon: "📋",
  },
  {
    value: "in_transit",
    label: "En Transporte",
    description: "Mercancía en transporte",
    icon: "🚚",
  },
  {
    value: "received",
    label: "Recibido",
    description: "Mercancía recibida, stock actualizado",
    icon: "📦",
  },
];

export default function PurchaseStepper({
  currentStatus,
  onStatusChange,
  readonly = false,
}: PurchaseStepperProps) {
  const currentIndex = PURCHASE_STEPS.findIndex(
    (step) => step.value === currentStatus
  );

  const canAdvance =
    currentIndex >= 0 && currentIndex < PURCHASE_STEPS.length - 1;
  const canRevert = currentIndex > 0 && currentStatus !== "received"; // No se puede retroceder desde recibido

  const handleAdvance = () => {
    if (canAdvance && onStatusChange) {
      const nextStatus = PurchaseService.getNextStatus(currentStatus);
      if (nextStatus) {
        onStatusChange(nextStatus);
      }
    }
  };

  const handleRevert = () => {
    if (canRevert && onStatusChange) {
      const prevStatus = PurchaseService.getPreviousStatus(currentStatus);
      if (prevStatus) {
        onStatusChange(prevStatus);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estado de la Compra</Text>

      {/* Steps visual */}
      <View style={styles.stepsContainer}>
        {PURCHASE_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isPending = index > currentIndex;

          return (
            <React.Fragment key={step.value}>
              {/* Step circle */}
              <View
                style={[
                  styles.stepCircle,
                  isActive && styles.stepCircleActive,
                  isCompleted && styles.stepCircleCompleted,
                  isPending && styles.stepCirclePending,
                ]}
              >
                <Text
                  style={[
                    styles.stepIcon,
                    isActive && styles.stepIconActive,
                    isCompleted && styles.stepIconCompleted,
                  ]}
                >
                  {step.icon}
                </Text>
              </View>

              {/* Connector line */}
              {index < PURCHASE_STEPS.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Step labels */}
      <View style={styles.labelsContainer}>
        {PURCHASE_STEPS.map((step, index) => {
          const isActive = index === currentIndex;

          return (
            <View key={step.value} style={styles.labelContainer}>
              <Text
                style={[styles.stepLabel, isActive && styles.stepLabelActive]}
              >
                {step.label}
              </Text>
              {isActive && (
                <Text style={styles.stepDescription}>{step.description}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Información del estado actual */}
      {currentStatus === "received" && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Esta compra ha sido recibida y ha actualizado el stock. No se puede
            retroceder.
          </Text>
        </View>
      )}

      {currentStatus === "draft" && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Esta compra está en borrador y puede editarse libremente.
          </Text>
        </View>
      )}

      {/* Action buttons */}
      {!readonly && (
        <View style={styles.actionsContainer}>
          <Button
            mode="outlined"
            onPress={handleRevert}
            disabled={!canRevert}
            style={[styles.actionButton, !canRevert && styles.disabledButton]}
            icon="arrow-left"
          >
            Retroceder
          </Button>

          <Button
            mode="contained"
            onPress={handleAdvance}
            disabled={!canAdvance}
            style={[styles.actionButton, !canAdvance && styles.disabledButton]}
            icon="arrow-right"
            contentStyle={{ flexDirection: "row-reverse" }}
          >
            {canAdvance
              ? `Avanzar a ${PURCHASE_STEPS[currentIndex + 1]?.label}`
              : "Completado"}
          </Button>
        </View>
      )}

      {/* Advertencia especial para recibir compra */}
      {canAdvance && PURCHASE_STEPS[currentIndex + 1]?.value === "received" && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Al marcar como "Recibido", se actualizará el stock automáticamente y
            no se podrá deshacer.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: palette.primary,
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  stepCircleActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  stepCircleCompleted: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  stepCirclePending: {
    backgroundColor: "#f0f0f0",
    borderColor: "#e0e0e0",
  },
  stepIcon: {
    fontSize: 20,
  },
  stepIconActive: {
    color: "white",
  },
  stepIconCompleted: {
    color: "white",
  },
  connector: {
    width: 40,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 8,
  },
  connectorCompleted: {
    backgroundColor: "#4CAF50",
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  labelContainer: {
    flex: 1,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    color: "#666",
  },
  stepLabelActive: {
    color: palette.primary,
  },
  stepDescription: {
    fontSize: 10,
    textAlign: "center",
    color: "#999",
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoContainer: {
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 6,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  infoText: {
    fontSize: 14,
    color: "#1976d2",
    textAlign: "center",
  },
  warningContainer: {
    backgroundColor: "#fff3e0",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#ff9800",
  },
  warningText: {
    fontSize: 12,
    color: "#e65100",
    textAlign: "center",
    fontWeight: "bold",
  },
});
