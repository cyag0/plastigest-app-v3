/**
 * Los pasos de una transferencia (Solicitud, Aprobación, Envío, Recepción)
 * como un indicador discreto debajo del encabezado del detalle: cada paso
 * hecho con su fecha, el de ahora marcado y, si se rechazó o canceló, el
 * paso en el que se quedó.
 *
 * Antes era una tarjeta de color sólido (un color por paso, fuera de la
 * paleta) con texto y círculos blancos que no cambiaba con el modo oscuro, y
 * los pasos se tocaban para ver cada uno por separado: ahora el detalle
 * muestra todo junto.
 */

import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import type { InventoryTransfer } from "@/utils/services/transferService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { transferSteps, type StepInfo, type StepState } from "./transferFormat";

export { getCurrentStepFromTransfer } from "./transferFormat";

const MARK = 20;

/** Hasta este paso llegó la transferencia (se pinta la línea que lo une). */
const reached = (state: StepState) => state === "done" || state === "current" || state === "failed";

export function TransferSteps({ transfer }: { transfer: InventoryTransfer }) {
  const styles = useThemedStyles(makeStyles);
  const steps = transferSteps(transfer);
  const active = steps.find((step) => step.state === "current" || step.state === "failed");
  const summary = active
    ? `${active.label}: ${active.state === "failed" ? active.caption : "pendiente"} (paso ${steps.indexOf(active) + 1} de ${steps.length})`
    : "Todos los pasos terminados";

  return (
    <View style={styles.row} accessible accessibilityLabel={`Pasos de la transferencia. ${summary}`}>
      {steps.map((step, index) => {
        const next = steps[index + 1];
        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.track}>
              <View style={[styles.line, index === 0 ? styles.lineHidden : reached(step.state) && styles.lineOn]} />
              <Marker state={step.state} />
              <View
                style={[styles.line, !next ? styles.lineHidden : reached(next.state) && styles.lineOn]}
              />
            </View>
            <Text
              style={[
                styles.label,
                step.state === "current" && styles.labelCurrent,
                step.state === "failed" && styles.labelFailed,
                (step.state === "upcoming" || step.state === "skipped") && styles.labelMuted,
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
            <Caption step={step} />
          </View>
        );
      })}
    </View>
  );
}

function Caption({ step }: { step: StepInfo }) {
  const styles = useThemedStyles(makeStyles);
  // Siempre ocupa su renglón: así las etiquetas quedan alineadas.
  return (
    <Text style={[styles.caption, step.state === "failed" && styles.captionFailed]} numberOfLines={1}>
      {step.caption ?? " "}
    </Text>
  );
}

function Marker({ state }: { state: StepState }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  switch (state) {
    case "done":
      return (
        <View style={[styles.mark, styles.markDone]}>
          <MaterialCommunityIcons name="check" size={13} color={colors.primaryForeground} />
        </View>
      );
    case "current":
      return (
        <View style={[styles.mark, styles.markCurrent]}>
          <View style={styles.dot} />
        </View>
      );
    case "failed":
      return (
        <View style={[styles.mark, styles.markFailed]}>
          <MaterialCommunityIcons name="close" size={12} color={colors.errorStrong} />
        </View>
      );
    case "skipped":
      return <View style={[styles.mark, styles.markSkipped]} />;
    default:
      return <View style={styles.mark} />;
  }
}

const makeStyles = themedStyles((c) => ({
  row: { flexDirection: "row", alignItems: "flex-start", width: "100%", maxWidth: 560 },
  step: { flex: 1, alignItems: "center", minWidth: 0 },
  track: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  line: { flex: 1, height: 2, backgroundColor: c.border },
  lineOn: { backgroundColor: c.primary },
  lineHidden: { backgroundColor: "transparent" },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 2,
    borderColor: c.borderStrong,
    backgroundColor: c.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  markDone: { borderColor: c.primary, backgroundColor: c.primary },
  markCurrent: { borderColor: c.primary },
  markFailed: { borderColor: c.errorStrong, backgroundColor: c.errorSoft },
  markSkipped: { borderColor: c.border, backgroundColor: c.surfaceMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  label: { marginTop: 6, fontSize: 12, lineHeight: 16, fontWeight: "500", color: c.textSecondary, textAlign: "center" },
  labelCurrent: { color: c.text, fontWeight: "700" },
  labelFailed: { color: c.errorStrong, fontWeight: "700" },
  labelMuted: { color: c.textMuted },
  caption: { fontSize: 11, lineHeight: 15, color: c.textMuted, textAlign: "center" },
  captionFailed: { color: c.errorStrong },
}));
