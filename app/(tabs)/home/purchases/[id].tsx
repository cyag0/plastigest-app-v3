/**
 * Detalle de una compra.
 *
 * Arriba de quién es, en qué quedó y cómo se pagó; luego los productos con lo
 * pedido, el precio pagado y lo que llegó. Antes toda compra se confirmaba
 * como pedido, se marcaba en tránsito y se recibía desde aquí; ahora:
 * - Borrador: se continúa en el formulario, donde se registra recibida
 *   (entra al inventario de una vez) o se guarda como pedido.
 * - Pedida o en tránsito: se recibe aquí mismo, con lo que llegó de cada
 *   producto. Marcar en tránsito es opcional y va en el menú ⋮.
 * Imprimir y cancelar también van en el menú ⋮.
 */

import EmptyState from "@/components/App/EmptyState";
import CashSourcePicker, {
  CASH_SOURCE_CODES,
  cashSessionLabel,
  useOpenCashSessions,
} from "@/components/Cash/CashSourcePicker";
import { apiErrorCode } from "@/components/Pos/saleErrors";
import IconLabel from "@/components/App/IconLabel";
import {
  LIST_TEXT_INSET,
  ListGroup,
  ListRow,
  ListSection,
  ListValueRow,
} from "@/components/App/ListGroup";
import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import RowMenu, { type RowMenuAction } from "@/components/App/RowMenu";
import StatusBadge from "@/components/App/StatusBadge";
import {
  SkeletonBlock,
  SkeletonSection,
  SummaryColumns,
  useSummaryLayout,
} from "@/components/App/SummaryLayout";
import PurchaseLineRow from "@/components/Purchases/PurchaseLineRow";
import {
  backendDateTime,
  historyEvent,
  lineImage,
  lineUnit,
  purchasePaymentMethod,
  receivedTotals,
  receiveRow,
  receiveSummary,
  resolutionLabel,
  statusHistory,
  toNum,
  type PurchaseRecord,
} from "@/components/Purchases/purchaseFormat";
import { fetchPurchase } from "@/components/Purchases/purchaseRequests";
import { purchaseStatus } from "@/constants/statuses";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate, formatDateTime } from "@/utils/dates";
import { errorMessageOf } from "@/utils/errorNotice";
import { formatMoney, formatQuantity } from "@/utils/format";
import { printPdf } from "@/utils/printDocument";
import Services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

/** Qué significa el estado para el inventario (el badge ya dice cuál es). */
function statusHint(status: string, shortCount: number): string {
  switch (status) {
    case "draft":
      return "Todavía no entra al inventario.";
    case "ordered":
    case "in_transit":
      return "Entra al inventario cuando se registre la recepción.";
    case "received":
      return shortCount > 0 ? "Entró al inventario solo lo que llegó." : "Ya entró al inventario.";
    case "cancelled":
      return "Se canceló sin mover inventario.";
    default:
      return "";
  }
}

export default function PurchaseDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { can, canAccessRoute } = useCan();
  // Recibir, marcar en tránsito y cancelar piden purchases_update. Continuar
  // un borrador abre el formulario: lo que pida su ruta (purchases_create).
  const canUpdate = can("purchases_update");
  const canContinue = canAccessRoute("/(tabs)/home/purchases/formv2");
  const layout = useSummaryLayout();
  const styles = useThemedStyles(makeStyles);

  const [purchase, setPurchase] = useState<PurchaseRecord | null>(null);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  // Lo que llegó de cada renglón y el precio pagado, tal como se escriben
  // (por id de detalle).
  const [receivedText, setReceivedText] = useState<Record<number, string>>({});
  const [priceText, setPriceText] = useState<Record<number, string>>({});
  const loaded = useRef(false);
  // Se abrió el formulario («Continuar compra»): un segundo toque no abre
  // otro sobre el mismo borrador, y al volver se recarga dos veces (abajo).
  const openedForm = useRef(false);
  // Candado de las acciones (recibir, en tránsito, cancelar, imprimir): un
  // doble toque no las manda dos veces.
  const { submitting: busy, run } = useSubmitGuard();

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setProblem({ kind: "not_found", message: "" });
      return;
    }
    try {
      const data = await fetchPurchase(id);
      setPurchase(data);
      // Por omisión llegó todo lo pedido; quien recibe corrige lo que faltó.
      // Al recargar (volver a la pantalla) se queda lo que ya se escribió.
      setReceivedText((prev) => {
        const next: Record<number, string> = {};
        (data.details ?? []).forEach((line) => {
          next[line.id] = prev[line.id] ?? String(toNum(line.quantity));
        });
        return next;
      });
      // El precio, por omisión el del pedido.
      setPriceText((prev) => {
        const next: Record<number, string> = {};
        (data.details ?? []).forEach((line) => {
          next[line.id] = prev[line.id] ?? String(toNum(line.unit_price));
        });
        return next;
      });
      setProblem(null);
      loaded.current = true;
    } catch (e) {
      // La primera carga explica la falla en la pantalla (404, sin permiso,
      // red); después se avisa y se queda lo que ya se veía.
      if (!loaded.current) setProblem(recordLoadProblem(e, "No se pudo cargar la compra."));
      else alerts.error(errorMessageOf(e, "No se pudo actualizar la compra."));
    }
  }, [id, alerts]);

  // Se recarga cada vez que se vuelve a la pantalla. Al volver del
  // formulario, el último cambio (un precio recién escrito) se manda cuando
  // el formulario se cierra, después de este GET: se pide otra vez un
  // momento después para no dejar el precio de antes.
  useFocusEffect(
    useCallback(() => {
      load();
      if (!openedForm.current) return;
      openedForm.current = false;
      const timer = setTimeout(load, 1500);
      return () => clearTimeout(timer);
    }, [load]),
  );

  const status = purchase?.status ?? "";
  // Antes solo se recibía una compra en tránsito; ahora también una pedida:
  // marcar en tránsito es opcional. La captura, solo para quien puede recibir.
  const receiving = (status === "ordered" || status === "in_transit") && canUpdate;

  const receiveRows = useMemo(
    () =>
      (purchase?.details ?? []).map((line) =>
        receiveRow(line, receivedText[line.id] ?? "", priceText[line.id]),
      ),
    [purchase, receivedText, priceText],
  );
  const summary = useMemo(() => receiveSummary(receiveRows), [receiveRows]);

  // Solo una compra en efectivo pagada con la caja registra egreso al recibir.
  const paidFromCash = purchase?.payment_method === "cash" && purchase?.paid_from_cash !== false;
  // De qué caja sale el pago, si quien recibe no tiene turno abierto.
  const cash = useOpenCashSessions(receiving && paidFromCash);
  const [cashSessionId, setCashSessionId] = useState<number | null>(null);
  const [cashAttempted, setCashAttempted] = useState(false);
  const chosenSession = cash.sessions.find((session) => session.id === cashSessionId) ?? null;
  const folio = purchase ? purchase.purchase_number || `#${purchase.id}` : "";

  const continuePurchase = () => {
    if (!purchase || openedForm.current) return;
    openedForm.current = true;
    router.push(`/(tabs)/home/purchases/formv2?id=${purchase.id}` as any);
  };

  const printPurchase = () =>
    run(async () => {
      if (!purchase) return;
      try {
        const { url } = await Services.purchasesV2.pdfUrl(purchase.id);
        if (!url) throw new Error("Sin URL del PDF");
        await printPdf(url, `compra-${purchase.purchase_number || purchase.id}.pdf`);
      } catch (e) {
        alerts.error(errorMessageOf(e, "No se pudo generar el PDF de la compra."));
      }
    });

  const markInTransit = () =>
    run(async () => {
      if (!purchase) return;
      const ok = await alerts.confirm("Queda en camino y se crea la tarea de recibirla.", {
        title: "¿Marcar en tránsito?",
        okText: "Marcar",
        cancelText: "Volver",
      });
      if (!ok) return;
      try {
        const response = await Services.purchasesV2.markInTransit(purchase.id);
        if (response?.success === false) {
          alerts.error(response.message || "No se pudo marcar la compra en tránsito.");
        } else {
          alerts.success("Compra marcada en tránsito");
        }
      } catch (e) {
        alerts.error(errorMessageOf(e, "No se pudo marcar la compra en tránsito."));
      }
      // También si falló: puede que ya haya cambiado (p. ej. el proveedor
      // contestó por WhatsApp y quedó en tránsito).
      await load();
    });

  // Antes siempre se mandaba lo pedido como recibido: un faltante subía al
  // stock lo que no llegó y el egreso de caja era por lo pedido.
  const receivePurchase = () =>
    run(async () => {
      if (!purchase) return;
      if (receiveRows.length === 0) {
        alerts.error("No hay productos para recibir");
        return;
      }
      const invalid = receiveRows.find((row) => row.error || row.priceError);
      if (invalid) {
        alerts.error(
          invalid.error
            ? `Revisa lo que llegó de ${invalid.line.product_name || "un producto"}: ${invalid.error}.`
            : `Revisa el precio de ${invalid.line.product_name || "un producto"}: ${invalid.priceError}.`,
        );
        return;
      }
      if (receiveRows.every((row) => row.received === 0)) {
        alerts.error(
          "Todos los productos están en 0. Si no llegó nada, deja la compra pendiente o cancélala.",
        );
        return;
      }

      // El pago sale ahora: tiene que salir del turno de alguna caja.
      const cashProblem = paidFromCash && summary.received > 0 ? cash.problem(cashSessionId) : null;
      if (cashProblem) {
        setCashAttempted(true);
        alerts.error(cashProblem);
        return;
      }

      const { short, received } = summary;
      const cashFrom = chosenSession && !cash.mine ? ` de ${cashSessionLabel(chosenSession)}` : "";
      const cashText = paidFromCash ? ` y sale un egreso de caja${cashFrom} por ${formatMoney(received)}` : "";
      const repricedCount = receiveRows.filter((row) => row.repriced).length;
      const repricedNote =
        repricedCount > 0
          ? `\n\nSe guarda el precio que pagaste en ${repricedCount} ${repricedCount === 1 ? "producto" : "productos"}, distinto al del pedido.`
          : "";
      const message =
        short.length > 0
          ? `Llegó menos de lo pedido en ${short.length} ${short.length === 1 ? "producto" : "productos"}:\n` +
            short
              .map(
                (row) =>
                  `• ${row.line.product_name || "Producto"}: ${formatQuantity(row.received)} de ${formatQuantity(row.ordered, lineUnit(row.line))}`,
              )
              .join("\n") +
            `\n\nEl stock sube solo por lo que llegó${cashText}. Queda una tarea para aclarar la diferencia con el proveedor.`
          : `Llegó todo lo pedido: el stock de los productos sube${cashText}.`;
      const confirmText = message + repricedNote;

      const ok = await alerts.confirm(confirmText, {
        title: "¿Registrar la recepción?",
        okText: "Registrar",
        cancelText: "Volver",
      });
      if (!ok) return;

      try {
        const details = receiveRows.map((row) => ({
          id: row.line.id,
          quantity_received: row.received as number,
          // Solo si cambió: sin él se queda el precio del pedido.
          ...(row.repriced ? { unit_price: row.price as number } : {}),
        }));
        const response = await Services.purchasesV2.receive(
          purchase.id,
          details,
          paidFromCash && !cash.mine ? cashSessionId : null,
        );
        if (response?.success === false) {
          alerts.error(response.message || "No se pudo registrar la recepción.");
        } else if (response?.cash_out_of_shift) {
          // El egreso quedó sin turno: ningún corte lo descuenta (lo mismo que
          // avisa el formulario al registrar una compra recibida).
          alerts.alert(
            "Compra recibida, pero no tienes turno abierto: el pago no se descuenta en ningún corte.",
            { type: "warning", duration: 8000 },
          );
        } else {
          alerts.success(
            short.length > 0
              ? "Compra recibida con faltantes. El stock subió con lo que llegó."
              : "Compra recibida. El stock ya se actualizó.",
          );
        }
      } catch (e) {
        alerts.error(errorMessageOf(e, "No se pudo registrar la recepción."));
        // Se cerró el turno elegido o el propio: se vuelven a pedir los abiertos.
        if (CASH_SOURCE_CODES.includes(apiErrorCode(e) ?? "")) cash.reload();
      }
      await load();
    });

  const cancelPurchase = () =>
    run(async () => {
      if (!purchase) return;
      const ok = await alerts.confirm(
        "No se puede deshacer. Como no se ha recibido, no mueve inventario.",
        { title: `¿Cancelar la compra ${folio}?`, okText: "Sí, cancelar", cancelText: "Volver" },
      );
      if (!ok) return;
      try {
        const response = await Services.purchasesV2.cancel(purchase.id);
        if (response?.success === false) {
          alerts.error(response.message || "No se pudo cancelar la compra.");
        } else {
          alerts.success("Compra cancelada");
        }
      } catch (e) {
        alerts.error(errorMessageOf(e, "No se pudo cancelar la compra."));
      }
      await load();
    });

  // Acciones secundarias en el menú ⋮ del encabezado (antes, un botón de
  // color por acción). Lo que no se puede hacer no aparece.
  const menu: RowMenuAction[] = purchase
    ? [
        { label: "Imprimir PDF", icon: "file-pdf-box", onPress: printPurchase },
        ...(canUpdate && status === "ordered"
          ? [{ label: "Marcar en tránsito", icon: "truck-delivery-outline" as const, onPress: markInTransit }]
          : []),
        // Recibida o cancelada ya no se cancela (el backend tampoco deja).
        ...(canUpdate && (status === "draft" || status === "ordered" || status === "in_transit")
          ? [{ label: "Cancelar compra", icon: "cancel" as const, onPress: cancelPurchase, destructive: true }]
          : []),
      ]
    : [];

  // El layout le pone "Ver Compra"; el menú depende de la compra y de los
  // permisos (sus acciones leen la compra de este render).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Compra",
      headerRight: () => (menu.length ? <RowMenu actions={menu} /> : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, purchase, canUpdate]);

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle="No se encontró la compra"
        errorTitle="No se pudo cargar la compra"
        onRetry={load}
      />
    );
  }

  if (!purchase) {
    return (
      <View style={styles.screen} onLayout={layout.onLayout}>
        <ScrollView contentContainerStyle={layout.contentStyle}>
          <DetailSkeleton twoColumns={layout.twoColumns} />
        </ScrollView>
      </View>
    );
  }

  const lines = purchase.details ?? [];
  const isReceived = status === "received";
  const totals = isReceived ? receivedTotals(lines) : null;
  const shortCount = totals?.short.length ?? 0;
  const hint = statusHint(status, shortCount);
  // Fotos solo si alguna tiene: así los renglones quedan alineados.
  const showThumbs = lines.some((line) => !!lineImage(line));
  const history = statusHistory(purchase.status_history);
  const resolution = purchase.discrepancy_resolution;
  const resolvedAt = resolution?.resolved_at ?? resolution?.resolution?.resolved_at ?? null;
  const deliveredAt = backendDateTime(purchase.delivery_date);

  const header = (
    <View style={[styles.header, !layout.phone && styles.headerWide]}>
      <View style={styles.headerText}>
        <Text style={styles.title} accessibilityRole="header">
          {purchase.supplier_name || "Compra sin proveedor"}
        </Text>
        <Text style={styles.subtitle} selectable>
          {[folio, purchase.purchase_date ? formatDate(purchase.purchase_date) : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        <View style={styles.statusRow}>
          {/* En un View cada uno se centra con el otro (sueltos se alinean arriba). */}
          <View>
            <StatusBadge {...purchaseStatus(status)} />
          </View>
          {!!purchase.payment_method && (
            <View>
              <IconLabel {...purchasePaymentMethod(purchase.payment_method)} />
            </View>
          )}
        </View>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>

      {/* El borrador se termina en el formulario: ahí se registra recibida o
          como pedido (ya no se confirma desde el detalle). */}
      {status === "draft" && canContinue && (
        <View style={layout.phone ? styles.headerActionPhone : undefined}>
          <Button
            mode="contained"
            icon="pencil-outline"
            onPress={continuePurchase}
            disabled={busy}
          >
            Continuar compra
          </Button>
        </View>
      )}
    </View>
  );

  const products = (
    <ListSection title="Productos" count={lines.length}>
      {receiving && lines.length > 0 && (
        <Text style={styles.hint}>
          Escribe cuánto llegó de cada producto y lo que pagaste; por omisión, lo del pedido.
        </Text>
      )}
      <ListGroup inset={LIST_TEXT_INSET}>
        {lines.length === 0 ? (
          <EmptyState
            compact
            icon="package-variant"
            title="Sin productos"
            description={status === "draft" && canContinue ? "Continúa la compra para agregarlos." : undefined}
          />
        ) : (
          lines.map((line, index) => (
            <PurchaseLineRow
              key={line.id}
              line={line}
              thumb={showThumbs}
              showReceived={isReceived}
              // Un renglón en $0 valuaría el inventario en $0 (los reportes
              // usan el precio de la última compra): se avisa a quien puede
              // corregirlo en el formulario. Abrirlo pide purchases_create,
              // pero cambiar el precio pide purchases_update.
              flagMissingPrice={status === "draft" && canContinue && canUpdate}
              receive={
                receiving
                  ? {
                      text: receivedText[line.id] ?? "",
                      row: receiveRows[index],
                      onChangeText: (text) =>
                        setReceivedText((prev) => ({ ...prev, [line.id]: text })),
                      priceText: priceText[line.id] ?? "",
                      onChangePrice: (text) =>
                        setPriceText((prev) => ({ ...prev, [line.id]: text })),
                    }
                  : undefined
              }
            />
          ))
        )}
        {lines.length > 0 && (
          <View style={styles.totals}>
            {totals && shortCount > 0 ? (
              // El total de la compra se queda como lo pedido; el egreso de
              // caja y lo que se le paga al proveedor es por lo que llegó.
              <>
                <TotalLine label="Total pedido" value={formatMoney(purchase.total)} />
                <TotalLine label="Total recibido" value={formatMoney(totals.received)} strong />
                <TotalLine label="Diferencia" value={formatMoney(totals.difference)} />
              </>
            ) : (
              <TotalLine label="Total" value={formatMoney(purchase.total)} strong />
            )}
          </View>
        )}
      </ListGroup>
    </ListSection>
  );

  // Recepción: lo que va a entrar con lo capturado arriba, y el botón.
  const reception = receiving && lines.length > 0 && (
    <ListSection title="Recepción">
      <ListGroup inset={LIST_TEXT_INSET}>
        <ListValueRow label="Productos con faltante" value={String(summary.short.length)} />
        <ListValueRow label="Valor de lo que llegó" value={formatMoney(summary.received)} />
        {summary.difference > 0 && (
          <ListValueRow label="Diferencia contra lo pedido" value={formatMoney(summary.difference)} />
        )}
      </ListGroup>
      {paidFromCash && (
        <Text style={styles.hint}>
          Se pagó con la caja: al registrar la recepción sale un egreso por {formatMoney(summary.received)}.
        </Text>
      )}
      <CashSourcePicker
        state={cash}
        active={paidFromCash}
        value={cashSessionId}
        onChange={setCashSessionId}
        emptyHint="deja la compra pendiente hasta que haya un turno abierto"
        showError={cashAttempted}
      />
      <Button
        mode="contained"
        icon="package-variant-closed-check"
        onPress={receivePurchase}
        loading={busy}
        disabled={busy}
        style={styles.receiveButton}
      >
        Registrar recepción
      </Button>
    </ListSection>
  );

  // Faltantes de una compra recibida: cuánto faltó y cómo se aclaró (la
  // aclaración es una tarea que se creó al recibir).
  const shortages = totals && shortCount > 0 && (
    <ListSection title="Faltantes">
      <ListGroup>
        <ListRow
          icon="alert-circle-outline"
          iconColor={colors.warning}
          title={`Llegó menos de lo pedido en ${shortCount} ${shortCount === 1 ? "producto" : "productos"}`}
          titleLines={2}
          subtitle={`Diferencia de ${formatMoney(totals.difference)}`}
          chevron={false}
        />
        {resolution ? (
          <ListRow
            icon="check-circle-outline"
            iconColor={colors.success}
            title={resolutionLabel(resolution.resolution?.type)}
            subtitle={resolution.resolution?.notes || undefined}
            meta={resolvedAt ? `Aclarada el ${formatDateTime(resolvedAt)}` : undefined}
            chevron={false}
          />
        ) : (
          <ListRow
            icon="clipboard-text-outline"
            title="Aclaración con el proveedor"
            subtitle="Al recibirla quedó una tarea para revisar la diferencia."
            chevron={false}
          />
        )}
      </ListGroup>
    </ListSection>
  );

  // Datos que no están arriba; cada uno, solo si viene.
  const dataRows = [
    purchase.payment_method === "cash" && (
      <ListValueRow
        key="cash"
        label="Pagado con la caja"
        value={purchase.paid_from_cash === false ? "No" : "Sí"}
      />
    ),
    !!purchase.expected_delivery_date && (
      <ListValueRow
        key="expected"
        label="Entrega esperada"
        value={formatDate(purchase.expected_delivery_date)}
      />
    ),
    !!deliveredAt && <ListValueRow key="delivered" label="Recibida el" value={formatDateTime(deliveredAt)} />,
    !!purchase.received_by_name && (
      <ListValueRow key="received-by" label="Recibió" value={purchase.received_by_name} />
    ),
    !!purchase.created_by_name && (
      <ListValueRow key="created-by" label="Registró" value={purchase.created_by_name} />
    ),
    !!purchase.document_number && (
      <ListValueRow key="document" label="Documento del proveedor" value={purchase.document_number} />
    ),
  ].filter(Boolean);

  const data = dataRows.length > 0 && (
    <ListSection title="Datos de la compra">
      <ListGroup inset={LIST_TEXT_INSET}>{dataRows}</ListGroup>
    </ListSection>
  );

  const notes = !!purchase.notes && (
    <ListSection title="Notas">
      <Text style={styles.notes} selectable>
        {purchase.notes}
      </Text>
    </ListSection>
  );

  // Lo que de verdad pasó y quién lo hizo. Antes era una línea fija de cuatro
  // pasos, que ya no aplica: una compra puede registrarse recibida de una vez.
  const historySection = history.length > 0 && (
    <ListSection title="Historial">
      <ListGroup>
        {history.map((entry, index) => {
          const event = historyEvent(entry);
          const when = entry.at ? formatDateTime(entry.at) : null;
          return (
            <ListRow
              key={index}
              icon={event.icon}
              title={event.title}
              subtitle={[when, entry.by_user_name].filter(Boolean).join(" · ") || undefined}
              meta={entry.reason || undefined}
              chevron={false}
            />
          );
        })}
      </ListGroup>
    </ListSection>
  );

  const side = (
    <>
      {reception}
      {shortages}
      {data}
      {notes}
      {historySection}
    </>
  );

  return (
    <View style={styles.screen} onLayout={layout.onLayout}>
      <ScrollView
        contentContainerStyle={layout.contentStyle}
        // Un toque en "Registrar recepción" con el teclado abierto cuenta.
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {header}
        {layout.twoColumns ? (
          <SummaryColumns main={products} side={side} />
        ) : (
          <>
            {products}
            {side}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TotalLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.totalLine}>
      <Text style={[styles.totalLabel, strong && styles.totalStrong]}>{label}</Text>
      <Text style={[styles.totalValue, strong && styles.totalStrong]}>{value}</Text>
    </View>
  );
}

/** Esqueleto con la forma del detalle mientras carga. */
function DetailSkeleton({ twoColumns }: { twoColumns: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const main = <SkeletonSection rows={4} />;
  const side = (
    <>
      <SkeletonSection rows={3} />
      <SkeletonSection rows={2} />
    </>
  );
  return (
    <>
      <View style={styles.skeletonHeader}>
        <SkeletonBlock width={220} height={26} radius={8} />
        <SkeletonBlock width={160} height={13} />
        <SkeletonBlock width={90} height={22} radius={11} />
      </View>
      {twoColumns ? (
        <SummaryColumns main={main} side={side} />
      ) : (
        <>
          {main}
          {side}
        </>
      )}
    </>
  );
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },

  // Encabezado sin tarjeta: el estado va en el badge y la acción, a la
  // derecha en pantallas anchas y debajo en el teléfono.
  header: { gap: 14 },
  headerWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: 24,
    rowGap: 14,
  },
  headerText: { gap: 4, flexShrink: 1, minWidth: 0 },
  headerActionPhone: { alignSelf: "stretch" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    rowGap: 6,
    marginTop: 6,
  },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  notes: { fontSize: 14, lineHeight: 20, color: c.text },

  // Totales al final de los productos, como en el detalle de venta.
  totals: { paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  totalLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 16 },
  totalLabel: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  totalValue: { fontSize: 14, lineHeight: 20, color: c.text, fontVariant: ["tabular-nums"] },
  totalStrong: { fontSize: 16, lineHeight: 22, fontWeight: "700", color: c.text },

  receiveButton: { marginTop: 4 },
  skeletonHeader: { gap: 8 },
}));
