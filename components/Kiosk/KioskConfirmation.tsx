/**
 * Pedido registrado: el número enorme para decirlo en caja, a nombre de
 * quién y el total. Vuelve sola a la bienvenida en 30 s.
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { KioskOrder } from "@/utils/services/kiosk";
import { amountToCents } from "@/utils/money";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import KioskButton from "./KioskButton";
import { formatCents } from "./model";

export const KIOSK_DONE_SECONDS = 30;

interface Props {
  order: KioskOrder;
  /** Nombre que escribió el cliente (si el servidor no lo regresa). */
  customerName: string;
  /** Total que vio el cliente antes de enviar, para avisar si cambió. */
  expectedTotalCents: number | null;
  onFinish: () => void;
}

export default function KioskConfirmation({ order, customerName, expectedTotalCents, onFinish }: Props) {
  const styles = useThemedStyles((c) => ({
    screen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
      backgroundColor: c.background,
    },
    label: { fontSize: 26, fontWeight: "600", color: c.textSecondary, textAlign: "center" },
    number: {
      fontSize: 120,
      lineHeight: 136,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
      letterSpacing: -2,
    },
    numberSmall: { fontSize: 56, lineHeight: 68 },
    message: { fontSize: 24, lineHeight: 32, color: c.text, textAlign: "center", maxWidth: 680 },
    total: { fontSize: 28, fontWeight: "700", color: c.text, textAlign: "center", fontVariant: ["tabular-nums"] },
    note: { fontSize: 18, color: c.textSecondary, textAlign: "center", maxWidth: 600 },
    button: { marginTop: 16, minWidth: 320 },
    countdown: { fontSize: 18, color: c.textSecondary, textAlign: "center" },
  }));

  const [seconds, setSeconds] = useState(KIOSK_DONE_SECONDS);
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const left = KIOSK_DONE_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        onFinishRef.current();
        return;
      }
      setSeconds(left);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const name = (order.customer_name ?? customerName).trim();
  const number = order.ticket_number != null ? String(order.ticket_number) : order.order_number ?? "—";
  const totalCents = amountToCents(order.total);
  const priceChanged = expectedTotalCents !== null && Number.isFinite(totalCents) && totalCents !== expectedTotalCents;

  return (
    <View style={styles.screen} testID="kiosk-done">
      <Text style={styles.label}>Tu número de pedido</Text>
      <Text
        style={[styles.number, number.length > 4 && styles.numberSmall]}
        testID="kiosk-ticket-number"
        accessibilityLabel={`Tu número de pedido es ${number}`}
      >
        {number}
      </Text>
      <Text style={styles.message}>
        {name ? `${name}, pasa a caja, di tu número y paga ahí.` : "Pasa a caja, di tu número y paga ahí."}
      </Text>
      <Text style={styles.total} testID="kiosk-done-total">
        Total a pagar: {formatCents(totalCents)}
      </Text>
      {priceChanged ? (
        <Text style={styles.note}>Algunos precios se actualizaron; este es el total que pagas en caja.</Text>
      ) : null}
      <KioskButton label="Terminar" size="lg" icon="check" onPress={onFinish} testID="kiosk-finish" style={styles.button} />
      <Text style={styles.countdown} testID="kiosk-done-countdown">
        Volviendo al inicio en {seconds} s
      </Text>
    </View>
  );
}
