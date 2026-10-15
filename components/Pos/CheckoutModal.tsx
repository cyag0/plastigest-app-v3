import AmountPreview from "@/components/Pos/AmountPreview";
import { apiErrorMessage, isOutcomeUnknown } from "@/components/Pos/saleErrors";
import palette from "@/constants/palette";
import { CheckoutMethod, formatMoney } from "@/hooks/usePosCart";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { amountToCents, centsToAmount } from "@/utils/money";
import { printSaleTicket } from "@/utils/printDocument";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button, Text } from "react-native-paper";

export type { CheckoutMethod } from "@/hooks/usePosCart";
type Payment = App.Entities.PosSalePayload["payments"][number];
type SaleResult = App.Entities.PosSaleResult;

interface Props {
  visible: boolean;
  total: number;
  initialMethod: CheckoutMethod;
  /**
   * El último cobro de este carrito se quedó sin respuesta (o la app se
   * cerró a medio envío): al abrir se verifica en qué quedó antes de dejar
   * cobrar otra vez.
   */
  pendingUnknown: boolean;
  onClose: () => void;
  /** Manda el cobro con la llave del carrito (client_request_id). */
  onSubmit: (payments: Payment[]) => Promise<SaleResult>;
  /**
   * Busca la venta del cobro pendiente por su llave: la venta si se
   * registró, null si no. Lanza si no se pudo consultar.
   */
  onVerify: () => Promise<SaleResult | null>;
  /** La búsqueda confirmó que la venta no se registró. */
  onNotCharged: () => void;
  /**
   * El servidor rechazó el cobro (no registró nada). Devuelve un aviso extra
   * para mostrar, p. ej. los precios o existencias que se actualizaron.
   */
  onRejected: (error: unknown) => Promise<string | null>;
  /** La venta quedó registrada (al cobrar o al verificar): vaciar el carrito. */
  onCharged: (sale: SaleResult) => void;
  /** Descartar el carrito aunque no se pudo confirmar el último cobro. */
  onDiscard: () => void;
  /** Tras "Nueva venta": cerrar y volver a buscar. */
  onDone: () => void;
}

/** "form": capturando el pago · "verifying": consultando un cobro sin respuesta · "unverified": no se pudo consultar · "discard": confirmando descartar. */
type Phase = "form" | "verifying" | "unverified" | "discard";

const METHODS: { key: CheckoutMethod; label: string; icon: string }[] = [
  { key: "cash", label: "Efectivo", icon: "cash" },
  { key: "card", label: "Tarjeta", icon: "credit-card-outline" },
  { key: "mixed", label: "Mixto", icon: "swap-horizontal" },
];

/** Espera antes de buscar una venta cuya respuesta se perdió: pudo seguir en proceso. */
const VERIFY_DELAY_MS = 1500;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Cobro: efectivo (recibido → cambio), tarjeta o mixto (parte en efectivo,
 * el resto con tarjeta). Al terminar muestra el cambio en grande.
 *
 * Los montos se calculan en centavos enteros, igual que el servidor. Mientras
 * se cobra no se puede cerrar (Cancelar, Esc ni el botón atrás): antes se
 * cerraba a medio envío, la venta se registraba igual y el carrito seguía
 * lleno, así que se cobraba dos veces. Si la respuesta no llega, se consulta
 * la venta por su llave antes de permitir otro intento.
 */
export default function CheckoutModal({
  visible,
  total,
  initialMethod,
  pendingUnknown,
  onClose,
  onSubmit,
  onVerify,
  onNotCharged,
  onRejected,
  onCharged,
  onDiscard,
  onDone,
}: Props) {
  const [method, setMethod] = useState<CheckoutMethod>(initialMethod);
  const [received, setReceived] = useState("");
  const [mixedCash, setMixedCash] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<SaleResult | null>(null);
  /** El total registrado no es el del carrito (se registró un cobro anterior). */
  const [mismatch, setMismatch] = useState<{ expected: number } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const { submitting: saving, run } = useSubmitGuard();

  const totalCents = amountToCents(total);

  const showResult = (sale: SaleResult, expectedCents: number) => {
    setResult(sale);
    setMismatch(amountToCents(sale.total) !== expectedCents ? { expected: centsToAmount(expectedCents) } : null);
    setError(null);
    setNotice(null);
    setPhase("form");
    onCharged(sale);
  };

  /**
   * Consulta en qué quedó el cobro pendiente. `expectedCents`: el total del
   * carrito que se mandó, para avisar si lo registrado es otra cosa.
   */
  const verify = async (afterFailure: boolean, expectedCents: number) => {
    setPhase("verifying");
    setError(null);
    setNotice(null);
    if (afterFailure) await wait(VERIFY_DELAY_MS);
    try {
      const sale = await onVerify();
      if (sale) {
        showResult(sale, expectedCents);
        return;
      }
      onNotCharged();
      setPhase("form");
      setNotice("La venta no se registró. Revisa el cobro e inténtalo de nuevo.");
    } catch (e: any) {
      setPhase("unverified");
      setError(apiErrorMessage(e, "No se pudo consultar la venta."));
    }
  };

  // Al abrir (no en cada render: al registrarse la venta el carrito se vacía
  // y cambian el total y el método, y la pantalla de "Venta registrada" debe
  // quedarse).
  const wasVisible = useRef(false);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setMethod(initialMethod);
      setReceived("");
      setMixedCash("");
      setError(null);
      setNotice(null);
      setResult(null);
      setMismatch(null);
      setPrintError(null);
      setPhase("form");
      if (pendingUnknown) run(() => verify(false, totalCents));
    }
    wasVisible.current = visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const printTicket = async () => {
    if (!result || printing) return;
    try {
      setPrinting(true);
      setPrintError(null);
      await printSaleTicket(result.id, result.sale_number);
    } catch (e: any) {
      setPrintError(e?.response?.data?.message || "No se pudo imprimir el ticket");
    } finally {
      setPrinting(false);
    }
  };

  // Recibido vacío = exacto. Un monto que no se entiende no deja cobrar.
  const receivedCents = received.trim() === "" ? totalCents : amountToCents(received);
  const receivedValid = Number.isFinite(receivedCents) && receivedCents >= 0;
  const changeCents = receivedValid ? receivedCents - totalCents : NaN;
  const cashPartCents = mixedCash.trim() === "" ? 0 : amountToCents(mixedCash);
  const mixedValid = Number.isFinite(cashPartCents) && cashPartCents > 0 && cashPartCents < totalCents;
  const cardPartCents = mixedValid ? totalCents - cashPartCents : NaN;

  const payments: Payment[] | null = (() => {
    if (!Number.isFinite(totalCents) || totalCents <= 0) return null;
    if (method === "cash") {
      return receivedValid && receivedCents >= totalCents
        ? [{ method: "cash", amount: centsToAmount(totalCents), tendered: centsToAmount(receivedCents) }]
        : null;
    }
    if (method === "card") return [{ method: "card", amount: centsToAmount(totalCents) }];
    if (mixedValid) {
      return [
        { method: "cash", amount: centsToAmount(cashPartCents), tendered: centsToAmount(cashPartCents) },
        { method: "card", amount: centsToAmount(cardPartCents) },
      ];
    }
    return null;
  })();

  const confirm = () =>
    run(async () => {
      if (!payments || phase !== "form" || result) return;
      const expectedCents = totalCents;
      setError(null);
      setNotice(null);
      try {
        showResult(await onSubmit(payments), expectedCents);
      } catch (e: any) {
        if (isOutcomeUnknown(e)) {
          // Sin respuesta o error del servidor: la venta pudo registrarse.
          await verify(true, expectedCents);
          return;
        }
        const extra = await onRejected(e).catch(() => null);
        setError(apiErrorMessage(e, "No se pudo registrar la venta."));
        setNotice(extra);
      }
    });

  const retryVerify = () => run(() => verify(false, totalCents));

  const finish = () => {
    setResult(null);
    onDone();
  };

  /** Esc, botón atrás o tocar fuera: nunca mientras se cobra o falta confirmar un cobro. */
  const requestClose = () => {
    if (result) {
      finish();
      return;
    }
    if (saving || phase !== "form") return;
    onClose();
  };

  // En web, en la pantalla de "Venta registrada": Enter empieza la
  // siguiente y P imprime el ticket.
  useEffect(() => {
    if (!result || Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish();
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        printTicket();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const formDisabled = saving || phase !== "form";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={requestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {result ? (
            <View style={styles.done}>
              <MaterialCommunityIcons name="check-circle" size={56} color={palette.success} />
              <Text variant="titleLarge" style={styles.doneTitle}>Venta registrada</Text>
              <Text style={styles.doneMeta}>{result.sale_number} · {formatMoney(result.total)}</Text>
              {mismatch && (
                <Text style={styles.mismatch}>
                  El total registrado ({formatMoney(result.total)}) no es el del carrito ({formatMoney(mismatch.expected)}):
                  quedó registrado un cobro anterior de este carrito. Revisa la venta {result.sale_number} antes de seguir.
                </Text>
              )}
              {result.change > 0 && (
                <View style={styles.changeBox}>
                  <Text style={styles.changeLabel}>Cambio</Text>
                  <Text style={styles.changeValue}>{formatMoney(result.change)}</Text>
                </View>
              )}
              <Button
                mode="outlined"
                icon="printer"
                onPress={printTicket}
                loading={printing}
                disabled={printing}
                style={styles.printButton}
                contentStyle={{ height: 44 }}
              >
                {Platform.OS === "web" ? "Imprimir ticket (P)" : "Imprimir ticket"}
              </Button>
              {!!printError && <Text style={styles.printError}>{printError}</Text>}
              <Button mode="contained" icon="cart-plus" onPress={finish} style={styles.primary} contentStyle={{ height: 52 }}>
                Nueva venta (Enter)
              </Button>
            </View>
          ) : phase === "verifying" ? (
            <View style={styles.done}>
              <ActivityIndicator size="large" color={palette.primary} />
              <Text variant="titleMedium" style={styles.doneTitle}>Verificando el cobro…</Text>
              <Text style={styles.hint}>
                No llegó la respuesta del servidor. Revisando si la venta quedó registrada; no cobres de nuevo todavía.
              </Text>
            </View>
          ) : phase === "unverified" || phase === "discard" ? (
            <View style={styles.done}>
              <MaterialCommunityIcons name="alert-circle-outline" size={52} color={palette.warning} />
              <Text variant="titleMedium" style={styles.doneTitle}>No se sabe si la venta se registró</Text>
              {phase === "unverified" ? (
                <>
                  <Text style={styles.hint}>
                    {error ? `${error} ` : ""}No la cobres de nuevo hasta verificarla: si ya quedó registrada se cobraría dos veces.
                  </Text>
                  <Button
                    mode="contained"
                    icon="refresh"
                    onPress={retryVerify}
                    loading={saving}
                    disabled={saving}
                    style={styles.primary}
                    contentStyle={{ height: 48 }}
                  >
                    Verificar de nuevo
                  </Button>
                  <Button mode="text" textColor={palette.error} onPress={() => setPhase("discard")} disabled={saving} style={styles.secondary}>
                    Descartar esta venta
                  </Button>
                </>
              ) : (
                <>
                  <Text style={styles.hint}>
                    Se vaciará el carrito. Si la venta sí se registró, quedará en Ventas y en el corte del turno: revísala antes de
                    volver a cobrar estos productos.
                  </Text>
                  <View style={styles.actions}>
                    <Button mode="outlined" onPress={() => setPhase("unverified")} style={{ flex: 1 }}>
                      Volver
                    </Button>
                    <Button mode="contained" buttonColor={palette.error} onPress={onDiscard} style={{ flex: 1 }}>
                      Descartar
                    </Button>
                  </View>
                </>
              )}
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.totalLabel}>Total a cobrar</Text>
                <Text style={styles.total}>{formatMoney(total)}</Text>
              </View>

              <View style={styles.methods}>
                {METHODS.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setMethod(m.key)}
                    disabled={formDisabled}
                    style={[styles.method, method === m.key && styles.methodActive]}
                  >
                    <MaterialCommunityIcons name={m.icon as any} size={22} color={method === m.key ? palette.primary : palette.textSecondary} />
                    <Text style={[styles.methodText, method === m.key && { color: palette.primary }]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>

              {method === "cash" && (
                <>
                  <Text style={styles.label}>Recibido</Text>
                  <TextInput
                    value={received}
                    onChangeText={setReceived}
                    placeholder={total.toFixed(2)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={palette.textMuted}
                    autoFocus
                    editable={!formDisabled}
                    onSubmitEditing={confirm}
                    style={styles.input}
                  />
                  <AmountPreview value={received} label="Recibido" />
                  {receivedValid && (
                    <View style={styles.row}>
                      <Text style={styles.label}>Cambio</Text>
                      <Text style={[styles.change, changeCents < 0 && { color: palette.error }]}>
                        {changeCents < 0 ? `Faltan ${formatMoney(centsToAmount(-changeCents))}` : formatMoney(centsToAmount(changeCents))}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {method === "card" && <Text style={styles.hint}>Cobra {formatMoney(total)} en la terminal y confirma.</Text>}

              {method === "mixed" && (
                <>
                  <Text style={styles.label}>Parte en efectivo</Text>
                  <TextInput
                    value={mixedCash}
                    onChangeText={setMixedCash}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={palette.textMuted}
                    autoFocus
                    editable={!formDisabled}
                    onSubmitEditing={confirm}
                    style={styles.input}
                  />
                  <AmountPreview value={mixedCash} label="En efectivo" />
                  <View style={styles.row}>
                    <Text style={styles.label}>Con tarjeta</Text>
                    <Text style={styles.change}>{mixedValid ? formatMoney(centsToAmount(cardPartCents)) : "—"}</Text>
                  </View>
                </>
              )}

              {!!notice && <Text style={styles.notice}>{notice}</Text>}
              {!!error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                {/* "Cancelar (Esc)" no cabía y se cortaba; el atajo ya está en la barra de atajos. */}
                <Button mode="outlined" onPress={requestClose} disabled={formDisabled} style={{ flex: 1 }}>
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  icon="check"
                  onPress={confirm}
                  loading={saving}
                  disabled={!payments || formDisabled}
                  style={{ flex: 2 }}
                  contentStyle={{ height: 48 }}
                >
                  Cobrar {formatMoney(total)}
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 460, backgroundColor: palette.surface, borderRadius: 16, padding: 20 },
  header: { alignItems: "center", marginBottom: 12 },
  totalLabel: { color: palette.textSecondary },
  total: { fontSize: 36, fontWeight: "800", color: palette.text },
  methods: { flexDirection: "row", gap: 8, marginBottom: 12 },
  method: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: palette.border, gap: 4 },
  methodActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  methodText: { fontWeight: "600", color: palette.textSecondary },
  label: { color: palette.textSecondary, fontWeight: "600", marginTop: 8 },
  input: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 12, fontSize: 24, marginTop: 6, color: palette.text },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  change: { fontSize: 24, fontWeight: "700", color: palette.success },
  hint: { color: palette.textSecondary, textAlign: "center", marginVertical: 16, lineHeight: 20 },
  notice: { color: palette.text, marginTop: 10, lineHeight: 20 },
  error: { color: palette.error, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 18, alignSelf: "stretch" },
  primary: { marginTop: 18, borderRadius: 10, alignSelf: "stretch" },
  secondary: { marginTop: 8, alignSelf: "stretch" },
  done: { alignItems: "center", paddingVertical: 8 },
  doneTitle: { fontWeight: "700", marginTop: 8, color: palette.text, textAlign: "center" },
  doneMeta: { color: palette.textSecondary },
  mismatch: { color: palette.warning, marginTop: 12, textAlign: "center", lineHeight: 20 },
  printButton: { alignSelf: "stretch", marginTop: 16 },
  printError: { color: palette.error, marginTop: 6, textAlign: "center" },
  changeBox: { alignItems: "center", marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: palette.successSoft, alignSelf: "stretch" },
  changeLabel: { color: palette.textSecondary },
  changeValue: { fontSize: 42, fontWeight: "800", color: palette.success },
});
