/**
 * "Salir del modo kiosko": teclado de PIN para el personal. Tras 5 intentos
 * fallidos hay que esperar 30 s (utils/kioskMode). Se monta solo mientras se
 * muestra, así cada vez empieza vacío.
 */
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { isValidKioskPin, kioskPinLockedUntil, verifyKioskPin } from "@/utils/kioskMode";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import KioskButton from "./KioskButton";
import { KioskDialog } from "./KioskOverlay";
import KioskPinPad from "./KioskPinPad";

interface Props {
  onCancel: () => void;
  /** PIN correcto: la pantalla quita el modo kiosko y va a Inicio. */
  onSuccess: () => void;
}

const secondsUntil = (until: number) => Math.max(0, Math.ceil((until - Date.now()) / 1000));

export default function KioskExitDialog({ onCancel, onSuccess }: Props) {
  const styles = useThemedStyles((c) => ({
    title: { fontSize: 26, fontWeight: "700", color: c.text, textAlign: "center" },
    subtitle: { fontSize: 18, color: c.textSecondary, textAlign: "center" },
    message: { fontSize: 18, fontWeight: "600", color: c.error, textAlign: "center" },
    wait: { fontSize: 18, fontWeight: "600", color: c.warning, textAlign: "center" },
    actions: { flexDirection: "row", gap: 12 },
    action: { flex: 1 },
  }));

  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState(kioskPinLockedUntil);
  const [waitSeconds, setWaitSeconds] = useState(() => secondsUntil(kioskPinLockedUntil()));
  const { submitting, run } = useSubmitGuard();
  const locked = lockedUntil > 0;

  // Cuenta de la espera tras los intentos fallidos.
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => {
      const left = secondsUntil(lockedUntil);
      setWaitSeconds(left);
      if (left <= 0) {
        setLockedUntil(0);
        clearInterval(timer);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const submit = () =>
    run(async () => {
      if (locked || !isValidKioskPin(pin)) return;
      const result = await verifyKioskPin(pin);
      if (result.ok || result.reason === "inactive") {
        // Sin PIN guardado no hay nada que proteger.
        onSuccess();
        return;
      }
      setPin("");
      if (result.reason === "locked") {
        setMessage(null);
        setWaitSeconds(secondsUntil(result.lockedUntil));
        setLockedUntil(result.lockedUntil);
        return;
      }
      setMessage(
        `PIN incorrecto. Te ${result.attemptsLeft === 1 ? "queda 1 intento" : `quedan ${result.attemptsLeft} intentos`}.`,
      );
    });

  return (
    <KioskDialog visible onDismiss={onCancel} testID="kiosk-exit-dialog" accessibilityLabel="Salir del modo kiosko">
      <View style={{ gap: 6 }}>
        <Text style={styles.title} accessibilityRole="header">
          Salir del modo kiosko
        </Text>
        <Text style={styles.subtitle}>Solo para el personal: escribe el PIN.</Text>
      </View>
      <KioskPinPad
        value={pin}
        onChange={(next) => {
          setPin(next);
          if (message) setMessage(null);
        }}
        disabled={locked || submitting}
        onSubmit={submit}
        testIDPrefix="kiosk-pin"
      />
      {locked ? (
        <Text style={styles.wait} testID="kiosk-exit-wait" accessibilityLiveRegion="polite">
          Demasiados intentos. Espera {waitSeconds} s.
        </Text>
      ) : message ? (
        <Text style={styles.message} testID="kiosk-exit-error" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <KioskButton label="Cancelar" variant="secondary" onPress={onCancel} testID="kiosk-exit-cancel" style={styles.action} />
        <KioskButton
          label="Salir"
          icon="logout"
          onPress={submit}
          disabled={locked || !isValidKioskPin(pin)}
          loading={submitting}
          testID="kiosk-exit-confirm"
          style={styles.action}
        />
      </View>
    </KioskDialog>
  );
}
