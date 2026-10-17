import { formatDate } from "@/utils/dates";
import IconLabel from "@/components/App/IconLabel";
import StatusBadge, { toneColors } from "@/components/App/StatusBadge";
import palette from "@/constants/palette";
import { paymentMethod, purchaseStatus } from "@/constants/statuses";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { formatQuantity, parseQuantity } from "@/utils/format";
import { centsToAmount, lineTotalCents, sumCents } from "@/utils/money";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Button, Chip, Divider, Surface, Text } from "react-native-paper";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (value: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);

const toNum = (v: any): number => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/** Motivo que manda el backend; nunca el texto en inglés de axios. */
const apiMessage = (error: any, fallback: string): string => {
  if (error?.isAxiosError && !error.response) {
    return "Sin conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  }
  const data = error?.response?.data;
  const fieldError = data?.errors
    ? (Object.values(data.errors).flat()[0] as string | undefined)
    : undefined;
  return fieldError || data?.message || data?.error || fallback;
};

/** ¿Los renglones son los mismos (cantidad, unidad y precio)? */
const sameDetails = (a: any[] = [], b: any[] = []): boolean =>
  a.length === b.length &&
  a.every((detail) => {
    const other = b.find((d) => d.id === detail.id);
    return (
      !!other &&
      Number(other.unit_id) === Number(detail.unit_id) &&
      toNum(other.quantity) === toNum(detail.quantity) &&
      toNum(other.unit_price) === toNum(detail.unit_price)
    );
  });

interface ReceiveRow {
  detail: any;
  ordered: number;
  /** Lo que llegó, ya validado; null si lo capturado no es válido. */
  received: number | null;
  error: string | null;
}

// ── Estado ────────────────────────────────────────────────────────────────────
// Etiqueta y tono: purchaseStatus. Aquí solo el ícono de cada paso del progreso.
const FLOW_STEPS = ["draft", "ordered", "in_transit", "received"] as const;

const STEP_ICONS: Record<(typeof FLOW_STEPS)[number], keyof typeof MaterialCommunityIcons.glyphMap> = {
  draft:      "file-document-edit-outline",
  ordered:    "cart-check",
  in_transit: "truck-delivery",
  received:   "package-variant-closed-check",
};

/** Método de pago de la compra: "Otro" solo existe en compras. */
const purchasePaymentMethod = (value: string) =>
  value === "other"
    ? { label: "Otro", icon: "dots-horizontal" as const }
    : paymentMethod(value);

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams();
  const alerts = useAlerts();
  const { colors } = useTheme();
  // Confirmar, marcar en tránsito, recibir y cancelar piden purchases_update.
  const canUpdate = useCan().can("purchases_update");
  const [purchase, setPurchase] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Candado de las acciones (confirmar, en tránsito, recibir, cancelar): un
  // doble toque no las manda dos veces.
  const { submitting: busy, run } = useSubmitGuard();
  // Lo que llegó de cada renglón, tal como se escribe (por id de detalle).
  const [receivedText, setReceivedText] = useState<Record<number, string>>({});

  useEffect(() => {
    loadPurchase();
  }, [id]);

  const applyPurchase = (data: any) => {
    setPurchase(data);
    // Por omisión llegó todo lo pedido; quien recibe corrige lo que faltó.
    const initial: Record<number, string> = {};
    (data?.details ?? []).forEach((d: any) => {
      initial[d.id] = String(toNum(d.quantity));
    });
    setReceivedText(initial);
  };

  const loadPurchase = async () => {
    try {
      setLoading(true);
      const response = await Services.purchasesV2.show(Number(id));
      applyPurchase(response.data.data);
    } catch (e: any) {
      alerts.error(apiMessage(e, "Error al cargar la compra"));
    } finally {
      setLoading(false);
    }
  };

  // Captura de lo recibido: solo para quien puede recibir.
  const receiving = purchase?.status === "in_transit" && canUpdate;

  // Cada renglón con lo que llegó: entre 0 y lo pedido (los paquetes, enteros).
  const receiveRows = useMemo<ReceiveRow[]>(
    () =>
      (purchase?.details ?? []).map((detail: any) => {
        const ordered = toNum(detail.quantity);
        const parsed = parseQuantity(receivedText[detail.id] ?? "");
        let error: string | null = null;
        if (parsed === null) error = "Escribe cuánto llegó";
        else if (parsed < 0) error = "No puede ser negativo";
        else if (parsed > ordered + 1e-9)
          error = `No puede ser más de lo pedido (${formatQuantity(ordered)})`;
        else if (detail.package_id && !Number.isInteger(parsed))
          error = "Los paquetes se reciben enteros";
        return {
          detail,
          ordered,
          received: error || parsed === null ? null : Math.round(parsed * 1000) / 1000,
          error,
        };
      }),
    [purchase, receivedText],
  );

  const receiveSummary = useMemo(() => {
    const short = receiveRows.filter(
      (row) => row.received !== null && row.received < row.ordered,
    );
    const orderedCents = sumCents(
      receiveRows.map((row) => lineTotalCents(row.ordered, row.detail.unit_price)),
    );
    const receivedCents = sumCents(
      receiveRows.map((row) => lineTotalCents(row.received ?? 0, row.detail.unit_price)),
    );
    return {
      short,
      received: centsToAmount(receivedCents),
      difference: centsToAmount(orderedCents - receivedCents),
    };
  }, [receiveRows]);

  // Solo una compra en efectivo pagada con la caja registra egreso al recibir.
  const paidFromCash =
    purchase?.payment_method === "cash" && purchase?.paid_from_cash !== false;

  const handleConfirmOrder = () =>
    run(async () => {
      if (
        !await alerts.confirm("¿Confirmar el pedido de compra?", {
          title: "Confirmar Pedido",
          okText: "Confirmar",
          cancelText: "Cancelar",
        })
      )
        return;
      try {
        // Se confirma lo que se ve: si la compra cambió mientras tanto (otro
        // dispositivo, cambios que apenas se guardaron), se muestra lo nuevo.
        const fresh = (await Services.purchasesV2.show(Number(id)))?.data?.data;
        if (
          !fresh ||
          fresh.status !== "draft" ||
          !sameDetails(purchase?.details, fresh.details)
        ) {
          if (fresh) applyPurchase(fresh);
          alerts.warning(
            "La compra cambió mientras la veías: revisa los productos y vuelve a confirmar.",
          );
          return;
        }
        const response = await Services.purchasesV2.confirm(Number(id));
        if (response.success) {
          alerts.success("Pedido confirmado exitosamente");
          await loadPurchase();
        } else {
          alerts.error(response.message || "Error al confirmar el pedido");
        }
      } catch (e: any) {
        alerts.error(apiMessage(e, "Error al confirmar el pedido"));
      }
    });

  const handleMarkInTransit = () =>
    run(async () => {
      if (
        !await alerts.confirm("¿Marcar la compra como en tránsito?", {
          title: "En Tránsito",
          okText: "Confirmar",
          cancelText: "Cancelar",
        })
      )
        return;
      try {
        const response = await Services.purchasesV2.markInTransit(Number(id));
        if (response.success) {
          alerts.success("Compra marcada como en tránsito");
          await loadPurchase();
        } else {
          alerts.error(response.message || "Error al actualizar el estado");
        }
      } catch (e: any) {
        alerts.error(apiMessage(e, "Error al actualizar el estado"));
      }
    });

  // Antes siempre se mandaba lo pedido como recibido: un faltante subía al
  // stock lo que no llegó y el egreso de caja era por lo pedido.
  const handleReceivePurchase = () =>
    run(async () => {
      if (!purchase?.details?.length) {
        alerts.error("No hay productos para recibir");
        return;
      }
      const invalid = receiveRows.find((row) => row.error);
      if (invalid) {
        alerts.error(
          `Revisa lo que llegó de ${invalid.detail.product_name || "un producto"}: ${invalid.error}.`,
        );
        return;
      }
      if (receiveRows.every((row) => row.received === 0)) {
        alerts.error(
          "Todos los productos están en 0. Si no llegó nada, deja la compra en tránsito o cancélala.",
        );
        return;
      }

      const { short, received } = receiveSummary;
      const cashText = paidFromCash
        ? ` y se registrará un egreso de caja por ${fmt(received)}`
        : "";
      const message =
        short.length > 0
          ? `Llegó menos de lo pedido en ${short.length} producto(s):\n` +
            short
              .map(
                (row) =>
                  `• ${row.detail.product_name}: ${formatQuantity(row.received)} de ${formatQuantity(row.ordered)} ${row.detail.unit_abbreviation ?? ""}`.trimEnd(),
              )
              .join("\n") +
            `\n\nEl stock subirá solo por lo que llegó${cashText}. Quedará una tarea para aclarar la diferencia con el proveedor. ¿Confirmar recepción?`
          : `¿Confirmar que llegó todo lo pedido? El stock de los productos subirá${cashText}.`;

      if (
        !await alerts.confirm(message, {
          title: "Recibir Compra",
          okText: "Confirmar",
          cancelText: "Cancelar",
        })
      )
        return;

      try {
        const details = receiveRows.map((row) => ({
          id: row.detail.id,
          quantity_received: row.received as number,
        }));
        const response = await Services.purchasesV2.receive(Number(id), details);
        if (response.success) {
          alerts.success(
            short.length > 0
              ? "Compra recibida con faltantes. Stock actualizado con lo que llegó."
              : "Compra recibida. Stock actualizado.",
          );
          await loadPurchase();
        } else {
          alerts.error(response.message || "Error al recibir la compra");
        }
      } catch (e: any) {
        alerts.error(apiMessage(e, "Error al recibir la compra"));
      }
    });

  const handleCancelPurchase = () =>
    run(async () => {
      if (
        !await alerts.confirm(
          "¿Cancelar esta compra? Esta acción no se puede deshacer.",
          {
            title: "Cancelar Compra",
            okText: "Cancelar Compra",
            cancelText: "Volver",
          },
        )
      )
        return;
      try {
        const response = await Services.purchasesV2.cancel(Number(id));
        if (response.success) {
          alerts.success("Compra cancelada");
          await loadPurchase();
        } else {
          alerts.error(response.message || "Error al cancelar");
        }
      } catch (e: any) {
        alerts.error(apiMessage(e, "Error al cancelar"));
      }
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  if (!purchase) {
    return (
      <View style={styles.center}>
        <Text>No se encontró la compra</Text>
      </View>
    );
  }

  const status = purchaseStatus(purchase.status);
  // Color del estado para lo que no es badge (el aviso de cancelada).
  const statusColor = toneColors(colors, status.tone).fg;
  const total = toNum(purchase.total);
  const isCancelled = purchase.status === "cancelled";
  const currentStepIndex = FLOW_STEPS.indexOf(purchase.status as any);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Encabezado: folio, estado y datos (sin tarjeta de color) ── */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]} selectable>
            {purchase.purchase_number || `#${purchase.id}`}
          </Text>
          {/* El View centra el badge con el folio (suelto se alinearía arriba). */}
          <View>
            <StatusBadge {...status} />
          </View>
        </View>
        <View style={styles.row}>
          <MaterialCommunityIcons name="store-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
            {purchase.supplier_name || purchase.supplier?.name || "Sin proveedor"}
          </Text>
        </View>
        <View style={styles.row}>
          <MaterialCommunityIcons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
            {formatDate(purchase.purchase_date, "long")}
          </Text>
        </View>

        <View style={[styles.headerDivider, { backgroundColor: colors.border }]} />

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total de compra
          </Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>
            {fmt(total)}
          </Text>
        </View>

        {!!purchase.payment_method && (
          <IconLabel {...purchasePaymentMethod(purchase.payment_method)} />
        )}
      </View>

      {/* ── Timeline de progreso ── */}
      {!isCancelled && (
        <Surface style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Progreso
          </Text>
          <View style={{ marginTop: 16 }}>
            {FLOW_STEPS.map((key, index) => {
              const isActive = key === purchase.status;
              const isCompleted = index < currentStepIndex;
              const isLast = index === FLOW_STEPS.length - 1;
              const reached = isActive || isCompleted;
              // Un solo acento para el avance: el color del estado ya va en el badge.
              const dotColor = reached ? colors.primary : colors.border;

              return (
                <View key={key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineDot,
                        { backgroundColor: dotColor, borderColor: dotColor },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isCompleted ? "check" : STEP_ICONS[key]}
                        size={14}
                        color={reached ? colors.primaryForeground : colors.textMuted}
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          {
                            backgroundColor: isCompleted
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text
                      variant="bodyMedium"
                      style={{
                        fontWeight: isActive ? "700" : "400",
                        color: reached ? colors.text : colors.textMuted,
                      }}
                    >
                      {purchaseStatus(key).label}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted, fontSize: 11 }}
                    >
                      {isActive
                        ? "Estado actual"
                        : isCompleted
                          ? "Completado"
                          : "Pendiente"}
                    </Text>
                  </View>
                  {reached && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={colors.primary}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Surface>
      )}

      {/* ── Cancelado ── */}
      {isCancelled && (
        <Surface
          style={[
            styles.card,
            { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface },
          ]}
          elevation={1}
        >
          <MaterialCommunityIcons name="close-circle" size={32} color={statusColor} />
          <View>
            <Text
              variant="titleMedium"
              style={{ fontWeight: "700", color: statusColor }}
            >
              Compra cancelada
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Esta compra fue cancelada
            </Text>
          </View>
        </Surface>
      )}

      {/* ── Productos ── */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Productos
          </Text>
          <Chip
            compact
            style={{ backgroundColor: palette.primary + "18" }}
            textStyle={{ color: palette.primary, fontSize: 12, fontWeight: "700" }}
          >
            {purchase.details?.length || 0}
          </Chip>
        </View>

        <View style={{ gap: 10, marginTop: 8 }}>
          {purchase.details?.map((detail: any, index: number) => {
            const imgUri =
              typeof detail.product_image === "string"
                ? detail.product_image
                : detail.product_image?.uri;
            const row = receiveRows[index];
            const receivedQty =
              detail.quantity_received != null ? toNum(detail.quantity_received) : null;
            const receivedShort =
              receivedQty !== null && receivedQty < toNum(detail.quantity);

            return (
              <View key={detail.id} style={styles.productItem}>
                {imgUri ? (
                  <Image
                    source={{ uri: imgUri }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[styles.productImage, styles.productImagePlaceholder]}
                  >
                    <MaterialCommunityIcons
                      name="package-variant"
                      size={24}
                      color="#A39F92"
                    />
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text
                    variant="bodyLarge"
                    style={{ fontWeight: "600" }}
                    numberOfLines={1}
                  >
                    {detail.product_name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: "#8F8B7D" }}>
                    {detail.product_code}
                  </Text>
                  {detail.package_name && (
                    <View style={[styles.row, { marginTop: 2 }]}>
                      <MaterialCommunityIcons
                        name="package-variant-closed"
                        size={12}
                        color="#A39F92"
                      />
                      <Text variant="bodySmall" style={{ color: "#8F8B7D" }}>
                        {detail.package_name}
                      </Text>
                    </View>
                  )}
                  <Text variant="bodySmall" style={{ color: "#A39F92", marginTop: 2 }}>
                    {detail.unit_name} ({detail.unit_abbreviation})
                  </Text>

                  <View
                    style={[
                      styles.row,
                      { justifyContent: "space-between", marginTop: 8 },
                    ]}
                  >
                    <View style={styles.qtyBadge}>
                      <Text
                        variant="bodySmall"
                        style={{ color: palette.primary, fontWeight: "700" }}
                      >
                        {toNum(detail.quantity)} × {fmt(toNum(detail.unit_price))}
                      </Text>
                    </View>
                    <Text
                      variant="titleSmall"
                      style={{ fontWeight: "bold", color: palette.primary }}
                    >
                      {fmt(toNum(detail.subtotal))}
                    </Text>
                  </View>

                  {purchase.status === "received" && receivedQty !== null && (
                    <View style={[styles.row, { marginTop: 4 }]}>
                      <MaterialCommunityIcons
                        name={receivedShort ? "alert-circle-outline" : "check-circle-outline"}
                        size={13}
                        color={receivedShort ? "#C47F12" : "#3F8A3A"}
                      />
                      <Text
                        variant="bodySmall"
                        style={{ color: receivedShort ? "#C47F12" : "#3F8A3A", fontWeight: "600" }}
                      >
                        Recibido: {formatQuantity(receivedQty)}
                        {receivedShort ? ` de ${formatQuantity(detail.quantity)}` : ""}{" "}
                        {detail.unit_abbreviation}
                      </Text>
                    </View>
                  )}

                  {/* Recepción: cuánto llegó de este producto (por omisión, lo pedido). */}
                  {receiving && row && (
                    <View style={styles.receiveBox}>
                      <View style={styles.row}>
                        <Text variant="bodySmall" style={styles.receiveLabel}>
                          Llegó
                        </Text>
                        <TextInput
                          value={receivedText[detail.id] ?? ""}
                          onChangeText={(text) =>
                            setReceivedText((prev) => ({ ...prev, [detail.id]: text }))
                          }
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                          editable={!busy}
                          style={[styles.receiveInput, row.error ? styles.receiveInputError : null]}
                        />
                        <Text variant="bodySmall" style={{ color: "#57564B", flexShrink: 1 }}>
                          de {formatQuantity(row.ordered)} {detail.unit_abbreviation}
                        </Text>
                      </View>
                      {row.error ? (
                        <Text variant="bodySmall" style={styles.receiveError}>
                          {row.error}
                        </Text>
                      ) : row.received !== null && row.received < row.ordered ? (
                        <Text variant="bodySmall" style={styles.receiveShort}>
                          Faltan {formatQuantity(row.ordered - row.received)}{" "}
                          {detail.unit_abbreviation}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <Divider style={{ marginVertical: 16 }} />
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <Text variant="titleMedium" style={{ fontWeight: "700" }}>
            Total
          </Text>
          <Text
            variant="titleLarge"
            style={{ fontWeight: "bold", color: palette.primary }}
          >
            {fmt(total)}
          </Text>
        </View>

        {/* ── Resumen de la recepción ── */}
        {receiving && (
          <View style={styles.receiveSummary}>
            <Text variant="titleSmall" style={{ fontWeight: "700" }}>
              Recepción
            </Text>
            <Text variant="bodySmall" style={{ color: "#57564B" }}>
              Si llegó menos de lo pedido, escribe en cada producto lo que llegó:
              el stock sube solo por eso.
            </Text>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text variant="bodyMedium">Productos con faltante</Text>
              <Text
                variant="bodyMedium"
                style={{
                  fontWeight: "700",
                  color: receiveSummary.short.length > 0 ? "#C47F12" : palette.text,
                }}
              >
                {receiveSummary.short.length}
              </Text>
            </View>
            <View style={[styles.row, { justifyContent: "space-between" }]}>
              <Text variant="bodyMedium">Valor de lo que llegó</Text>
              <Text variant="bodyMedium" style={{ fontWeight: "700" }}>
                {fmt(receiveSummary.received)}
              </Text>
            </View>
            {receiveSummary.difference > 0 && (
              <View style={[styles.row, { justifyContent: "space-between" }]}>
                <Text variant="bodyMedium">Diferencia contra lo pedido</Text>
                <Text variant="bodyMedium" style={{ fontWeight: "700", color: "#C47F12" }}>
                  {fmt(receiveSummary.difference)}
                </Text>
              </View>
            )}
            {paidFromCash && (
              <Text variant="bodySmall" style={{ color: palette.primary }}>
                Se pagó con la caja: al recibir se registra un egreso por{" "}
                {fmt(receiveSummary.received)}.
              </Text>
            )}
          </View>
        )}
      </Surface>

      {/* ── Notas ── */}
      {purchase.notes && (
        <Surface style={styles.card} elevation={1}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <MaterialCommunityIcons
              name="note-text-outline"
              size={18}
              color={palette.primary}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notas
            </Text>
          </View>
          <Text variant="bodyMedium" style={{ color: "#57564B", lineHeight: 20 }}>
            {purchase.notes}
          </Text>
        </Surface>
      )}

      {/* ── Acciones ── */}
      {canUpdate && (
        <View style={{ gap: 10 }}>
          {purchase.status === "draft" && (
            <Button
              mode="contained"
              onPress={handleConfirmOrder}
              loading={busy}
              disabled={busy}
              icon="cart-check"
              buttonColor="#2F6F7E"
              style={styles.actionBtn}
            >
              Confirmar Pedido
            </Button>
          )}

          {purchase.status === "ordered" && (
            <Button
              mode="contained"
              onPress={handleMarkInTransit}
              loading={busy}
              disabled={busy}
              icon="truck-delivery"
              buttonColor="#7A6A8C"
              style={styles.actionBtn}
            >
              Marcar en Tránsito
            </Button>
          )}

          {purchase.status === "in_transit" && (
            <Button
              mode="contained"
              onPress={handleReceivePurchase}
              loading={busy}
              disabled={busy}
              icon="package-variant-closed-check"
              buttonColor="#3F8A3A"
              style={styles.actionBtn}
            >
              Confirmar Recepción
            </Button>
          )}

          {purchase.status !== "received" && purchase.status !== "cancelled" && (
            <Button
              mode="outlined"
              onPress={handleCancelPurchase}
              loading={busy}
              disabled={busy}
              icon="close-circle-outline"
              textColor="#B9412C"
              style={[styles.actionBtn, { borderColor: "#B9412C" }]}
            >
              Cancelar Compra
            </Button>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:  { flex: 1, backgroundColor: "#F3F0E8" },
  content: { padding: 16, gap: 14 },
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },
  card:    { backgroundColor: "white", borderRadius: 18, padding: 20 },

  // Encabezado: superficie lisa; el estado va en el badge (colores en línea, del tema).
  header:         { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 2 },
  headerTitle:    { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  headerMeta:     { fontSize: 13, flexShrink: 1 },
  headerDivider:  { height: 1, marginVertical: 8 },
  totalRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel:     { fontSize: 14, fontWeight: "500" },
  totalValue:     { fontSize: 22, fontWeight: "700", fontVariant: ["tabular-nums"] },

  // Common
  row:           { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle:  { fontWeight: "700" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  // Timeline
  timelineItem:    { flexDirection: "row", alignItems: "flex-start", paddingBottom: 20 },
  timelineLeft:    { alignItems: "center", marginRight: 14 },
  timelineDot:     { width: 30, height: 30, borderRadius: 15, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  timelineLine:    { width: 2, flex: 1, marginTop: 4, minHeight: 24 },
  timelineContent: { flex: 1, paddingTop: 4 },

  // Products
  productItem:             { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: "#F6F4EE", borderRadius: 12, padding: 12 },
  productImage:            { width: 60, height: 60, borderRadius: 10 },
  productImagePlaceholder: { backgroundColor: "#E6E1D5", justifyContent: "center", alignItems: "center" },
  qtyBadge:                { backgroundColor: "#DFEDF0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Recepción
  receiveBox:        { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#E6E1D5", gap: 4 },
  receiveLabel:      { color: "#57564B", fontWeight: "600" },
  receiveInput:      { minWidth: 72, height: 36, paddingHorizontal: 8, borderWidth: 1, borderColor: "#D6D1C4", borderRadius: 8, backgroundColor: "white", textAlign: "center", fontWeight: "700", color: palette.text },
  receiveInputError: { borderColor: "#B9412C" },
  receiveError:      { color: "#B9412C" },
  receiveShort:      { color: "#C47F12", fontWeight: "600" },
  receiveSummary:    { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: "#F6F4EE", gap: 6 },

  // Actions
  actionBtn: { borderRadius: 10 },
});
