/**
 * Paso 1, aprobación: la sucursal de origen escribe cuánto va a enviar de
 * cada producto (por omisión, lo pedido; puede ser 0) y la aprueba, o la
 * rechaza. Para los demás (quien la pidió, quien no tiene permiso) es solo
 * lectura y el encabezado dice a quién le toca.
 *
 * Aprobar: POST approve con items[{detail_id, quantity_requested}]; rechazar:
 * POST reject con un motivo fijo. Ninguno mueve inventario. Antes las
 * cantidades no aceptaban decimales («1.5» se volvía 1) y un campo vacío se
 * aprobaba en 0 sin avisar.
 */

import EmptyState from "@/components/App/EmptyState";
import { FormFooter } from "@/components/Form/FormLayout";
import { TransferLayout, TransferProducts } from "@/components/Transfers/TransferDetailParts";
import TransferLineRow, { TransferQuantityInput } from "@/components/Transfers/TransferLineRow";
import {
  captureUnit,
  exceedsStock,
  lineName,
  lineQty,
  lineStages,
  num,
  quantityInput,
  readQuantity,
  shortName,
  stockText,
  stockWarning,
  type TransferLine,
} from "@/components/Transfers/transferFormat";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf } from "@/utils/errorNotice";
import type { InventoryTransfer } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import React, { useMemo, useState } from "react";
import { Text, useWindowDimensions } from "react-native";
import { Button } from "react-native-paper";

/** El motivo que manda "Rechazar" (el backend lo pide). */
const REJECTION_REASON = "Rechazada desde wizard de transferencias";

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

interface Props {
  transfer: InventoryTransfer;
  header: React.ReactNode;
  /** Arriba de los productos (la nota de quien pidió). */
  intro?: React.ReactNode;
  side: React.ReactNode;
  /** Origen con transfers_update en el paso 1: ajusta cantidades, aprueba o rechaza. */
  canApprove: boolean;
  /** Existencia del origen en cada renglón (la ve quien surte). */
  showStock: boolean;
  onCompleted: () => Promise<void>;
}

export default function TransferStepOneApproval({
  transfer,
  header,
  intro,
  side,
  canApprove,
  showStock,
  onCompleted,
}: Props) {
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const narrow = useWindowDimensions().width < 520;
  // Candado de aprobar/rechazar: un doble toque no manda la acción dos veces.
  const { submitting, run } = useSubmitGuard();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const lines = useMemo(() => (transfer.details ?? []) as TransferLine[], [transfer.details]);
  // Cuánto se va a enviar de cada renglón, tal como se escribe (por omisión, lo pedido).
  const initialTexts = () =>
    Object.fromEntries(lines.map((line) => [line.id, quantityInput(num(line.quantity_requested))]));
  // La pantalla monta esta vista con key por transferencia y updated_at: al
  // recargarla, lo capturado vuelve a empezar.
  const [texts, setTexts] = useState<Record<number, string>>(initialTexts);

  const rows = lines.map((line) => {
    const requested = num(line.quantity_requested);
    const text = texts[line.id] ?? quantityInput(requested);
    const read = readQuantity(text, "Escribe cuánto vas a enviar (puede ser 0)");
    return { line, requested, text, quantity: read.value, error: read.error };
  });
  const invalid = rows.filter((row) => row.error);

  // Lo que dice la barra: el error del servidor o, después de intentar, lo que falta.
  let note: string | null = serverError;
  if (!note && attempted && invalid.length > 0) {
    note =
      invalid.length === 1
        ? `${shortName(lineName(invalid[0].line))}: ${lowerFirst(invalid[0].error!)}.`
        : `Revisa los ${invalid.length} productos marcados.`;
  }

  const change = (lineId: number, value: string) => {
    setServerError(null);
    setTexts((prev) => ({ ...prev, [lineId]: value }));
  };

  /** Lo que dice la confirmación: las cantidades que cambiaron y qué pasa al aprobar. */
  const approveMessage = () => {
    const changed = rows.filter((row) => Math.abs((row.quantity ?? 0) - row.requested) > 1e-9);
    const sending = rows.filter((row) => (row.quantity ?? 0) > 0);
    let message: string;
    if (sending.length === 0) {
      message = "Todos los productos quedan en 0: no se va a enviar nada. Si no puedes surtirla, mejor recházala.";
    } else if (changed.length === 0) {
      message = "Vas a enviar lo que pidieron.";
    } else {
      const shown = changed.slice(0, 6).map((row) => {
        const quantity = row.quantity ?? 0;
        return `• ${lineName(row.line)}: ${quantity > 0 ? lineQty(row.line, quantity) : "no se envía"} (pidieron ${lineQty(row.line, row.requested)})`;
      });
      if (changed.length > shown.length) shown.push(`• y ${changed.length - shown.length} más`);
      message = `Cambiaste ${changed.length === 1 ? "una cantidad" : `${changed.length} cantidades`}:\n${shown.join("\n")}`;
    }
    const stock = stockWarning(rows.map((row) => ({ line: row.line, quantity: row.quantity ?? 0 })));
    return (
      `${message}\n\nAprobar todavía no mueve inventario: sale de tu sucursal cuando registres el envío. A quien la pidió le llega un aviso.` +
      (stock ? `\n\n${stock}` : "")
    );
  };

  const approve = () =>
    run(async () => {
      setAttempted(true);
      setServerError(null);
      if (invalid.length > 0) return;
      const ok = await alerts.confirm(approveMessage(), {
        title: "¿Aprobar la transferencia?",
        okText: "Aprobar",
        cancelText: "Volver",
      });
      if (!ok) return;
      setPending("approve");
      try {
        await transferService.approve(
          transfer.id,
          {
            items: rows.map((row) => ({
              detail_id: row.line.id,
              quantity_requested: row.quantity as number,
            })),
          },
          { silent: true },
        );
        alerts.success("Transferencia aprobada");
        await onCompleted();
      } catch (error) {
        setServerError(errorMessageOf(error, "No se pudo aprobar la transferencia."));
      } finally {
        setPending(null);
      }
    });

  const reject = () =>
    run(async () => {
      setServerError(null);
      const ok = await alerts.confirm(
        "La solicitud termina como rechazada y a quien la pidió le llega un aviso. No se mueve inventario y no se puede deshacer.",
        { title: "¿Rechazar la solicitud?", okText: "Rechazar", cancelText: "Volver" },
      );
      if (!ok) return;
      setPending("reject");
      try {
        await transferService.reject(transfer.id, REJECTION_REASON, { silent: true });
        alerts.success("Transferencia rechazada");
        await onCompleted();
      } catch (error) {
        setServerError(errorMessageOf(error, "No se pudo rechazar la transferencia."));
      } finally {
        setPending(null);
      }
    });

  const showThumbs = lines.some((line) => !!line.product?.main_image);

  const products = (
    <TransferProducts
      count={lines.length}
      hint={
        canApprove && lines.length > 0
          ? "Escribe cuánto vas a enviar de cada producto; por omisión, lo que pidieron. Puede ser 0."
          : null
      }
    >
      {lines.length === 0 ? (
        <EmptyState compact icon="package-variant" title="Sin productos" />
      ) : (
        rows.map((row) => {
          const { line } = row;
          const quantity = row.quantity;
          // Los errores de lo escrito se ven al escribir; el campo vacío, al aprobar.
          const showError = !!row.error && (attempted || row.text.trim() !== "");
          let rowNote: React.ReactNode = null;
          if (canApprove) {
            if (showError) rowNote = <Text style={styles.error}>{row.error}</Text>;
            else if (quantity !== null && quantity <= 0) rowNote = <Text style={styles.muted}>No se envía</Text>;
            else if (quantity !== null && showStock && exceedsStock(line, quantity))
              rowNote = <Text style={styles.warning}>{`Solo hay ${stockText(line)} en tu sucursal`}</Text>;
            else if (quantity !== null && quantity > row.requested + 1e-9)
              rowNote = <Text style={styles.warning}>Más de lo que pidieron</Text>;
          }
          return (
            <TransferLineRow
              key={line.id}
              line={line}
              thumb={showThumbs}
              stages={lineStages(transfer, line)}
              showStock={showStock}
              warning={
                !canApprove && showStock && exceedsStock(line, row.requested)
                  ? `Solo hay ${stockText(line)} en tu sucursal`
                  : null
              }
            >
              {canApprove && (
                <>
                  <TransferQuantityInput
                    label="Enviar"
                    value={row.text}
                    onChangeText={(value) => change(line.id, value)}
                    unit={captureUnit(line)}
                    invalid={showError}
                    accessibilityLabel={`Cuánto vas a enviar de ${lineName(line)}`}
                  />
                  {rowNote}
                </>
              )}
            </TransferLineRow>
          );
        })
      )}
    </TransferProducts>
  );

  const footer = canApprove ? (
    <FormFooter note={note}>
      {/* En el teléfono "Rechazar" ocupa solo lo suyo. */}
      <Button
        mode="outlined"
        onPress={reject}
        disabled={submitting}
        loading={pending === "reject"}
        textColor={colors.error}
        compact={narrow}
        style={narrow ? undefined : { flex: 1 }}
      >
        Rechazar
      </Button>
      <Button
        mode="contained"
        onPress={approve}
        disabled={submitting}
        loading={pending === "approve"}
        compact={narrow}
        style={{ flex: narrow ? 1 : 1.4 }}
      >
        Aprobar
      </Button>
    </FormFooter>
  ) : null;

  return (
    <TransferLayout
      header={header}
      main={
        <>
          {intro}
          {products}
        </>
      }
      side={side}
      footer={footer}
    />
  );
}

const makeStyles = themedStyles((c) => ({
  muted: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 6 },
  // Ocre "Strong": el ocre normal no llega a 4.5:1 en letra chica.
  warning: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: c.warningStrong, marginTop: 6 },
  error: { fontSize: 13, lineHeight: 18, color: c.error, marginTop: 6 },
}));
