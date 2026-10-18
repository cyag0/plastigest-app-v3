/**
 * Paso 2, envío: la sucursal de origen manda lo aprobado de cada producto
 * con al menos una foto (hasta 8). Al registrarlo el inventario sale de su
 * sucursal y la transferencia queda en tránsito. Para los demás es solo
 * lectura.
 *
 * POST ship (multipart): items[{detail_id, quantity_shipped}] con lo
 * aprobado de cada renglón (quantity_approved; el backend no deja mandar más)
 * y evidence[] con las fotos.
 */

import { ListSection } from "@/components/App/ListGroup";
import EmptyState from "@/components/App/EmptyState";
import AppUpload, { type UploadedFile } from "@/components/Form/AppUpload";
import { FormFooter } from "@/components/Form/FormLayout";
import { TransferLayout, TransferProducts, transferPlaces } from "@/components/Transfers/TransferDetailParts";
import TransferLineRow from "@/components/Transfers/TransferLineRow";
import {
  exceedsStock,
  lineApproved,
  lineName,
  lineQty,
  lineStages,
  stockText,
  stockWarning,
  type TransferLine,
} from "@/components/Transfers/transferFormat";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { errorMessageOf } from "@/utils/errorNotice";
import type { InventoryTransfer, TransferShipStepItem } from "@/utils/services/transferService";
import transferService from "@/utils/services/transferService";
import React, { useMemo, useState } from "react";
import { Text } from "react-native";

const MAX_PHOTOS = 8;

interface Props {
  transfer: InventoryTransfer;
  header: React.ReactNode;
  intro?: React.ReactNode;
  side: React.ReactNode;
  /** Origen con transfers_update en el paso 2: sube las fotos y envía. */
  canShip: boolean;
  /** Existencia del origen en cada renglón (la ve quien surte). */
  showStock: boolean;
  onCompleted: () => Promise<void>;
}

export default function TransferStepTwoShip({ transfer, header, intro, side, canShip, showStock, onCompleted }: Props) {
  const alerts = useAlerts();
  const styles = useThemedStyles(makeStyles);
  const { selectedCompany } = useAuth();
  const { submitting, run } = useSubmitGuard();
  // La pantalla monta esta vista con key por transferencia y updated_at: al
  // recargarla, las fotos elegidas vuelven a empezar.
  const [evidence, setEvidence] = useState<UploadedFile[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Enviando (ya confirmado): el botón muestra que se está guardando.
  const [sending, setSending] = useState(false);
  const places = transferPlaces(transfer, selectedCompany?.name);

  const step2Status = String((transfer.content as any)?.step_2?.status || "").toLowerCase();
  const transferStatus = String(transfer.status || "").toLowerCase();
  const isHistoricalStep2 =
    step2Status === "shipped" ||
    transferStatus === "in_transit" ||
    transferStatus === "completed" ||
    transferStatus === "rejected" ||
    transferStatus === "cancelled" ||
    transferStatus === "closed";

  const lines = useMemo(() => (transfer.details ?? []) as TransferLine[], [transfer.details]);
  // Se envía lo aprobado de cada renglón (o lo ya enviado, si ya salió). Lo
  // pedido ya no se reescribe al aprobar: lo aprobado va aparte.
  const rows = lines.map((line) => {
    const approvedQuantity = lineApproved(line);
    const shippedQuantity = Number(line.quantity_shipped ?? 0);
    return {
      line,
      quantity_shipped: isHistoricalStep2 && shippedQuantity > 0 ? shippedQuantity : approvedQuantity,
    };
  });

  const missingPhotos = evidence.length === 0;
  let note: string | null = serverError;
  if (!note && attempted) {
    if (rows.length === 0) note = "No hay productos para enviar.";
    else if (missingPhotos) note = "Sube al menos una foto del envío.";
  }

  const shipMessage = () => {
    const toSend = rows.filter((row) => row.quantity_shipped > 0);
    const skipped = rows.filter((row) => row.quantity_shipped <= 0);
    const shown = toSend.slice(0, 6).map((row) => `• ${lineName(row.line)}: ${lineQty(row.line, row.quantity_shipped)}`);
    if (toSend.length > shown.length) shown.push(`• y ${toSend.length - shown.length} más`);
    const notSent = skipped.length
      ? `\nNo se envía: ${skipped.map((row) => lineName(row.line)).join(", ")}.`
      : "";
    const stock = stockWarning(rows.map((row) => ({ line: row.line, quantity: row.quantity_shipped })));
    // Solo envía el origen: "tu sucursal".
    return (
      `Sale del inventario de tu sucursal:\n${shown.join("\n")}${notSent}\n\n` +
      `La transferencia queda en tránsito y ${places.to} recibe la tarea de recibirla.` +
      (stock ? `\n\n${stock}` : "")
    );
  };

  const ship = () =>
    run(async () => {
      setAttempted(true);
      setServerError(null);
      if (rows.length === 0 || missingPhotos) return;

      const ok = await alerts.confirm(shipMessage(), {
        title: "¿Registrar el envío?",
        okText: "Enviar",
        cancelText: "Volver",
      });
      if (!ok) return;

      const payloadItems: TransferShipStepItem[] = rows.map((row) => ({
        detail_id: row.line.id,
        quantity_shipped: Number(row.quantity_shipped),
      }));

      setSending(true);
      try {
        await transferService.ship(transfer.id, { items: payloadItems, evidence }, { silent: true });
        alerts.success("Envío registrado: la mercancía ya salió de tu inventario.");
        await onCompleted();
      } catch (error) {
        setServerError(errorMessageOf(error, "No se pudo registrar el envío."));
      } finally {
        setSending(false);
      }
    });

  const showThumbs = lines.some((line) => !!line.product?.main_image);

  const products = (
    <TransferProducts
      count={lines.length}
      hint={canShip && lines.length > 0 ? "Se envía lo aprobado de cada producto." : null}
    >
      {lines.length === 0 ? (
        <EmptyState compact icon="package-variant" title="Sin productos" />
      ) : (
        rows.map(({ line, quantity_shipped }) => (
          <TransferLineRow
            key={line.id}
            line={line}
            thumb={showThumbs}
            stages={lineStages(transfer, line)}
            showStock={showStock}
            // El backend no deja enviar más de lo que hay: se avisa antes.
            warning={
              showStock && quantity_shipped > 0 && exceedsStock(line, quantity_shipped)
                ? `Solo hay ${stockText(line)} en tu sucursal`
                : null
            }
          />
        ))
      )}
    </TransferProducts>
  );

  const photos = canShip && (
    <ListSection title="Fotos del envío">
      <Text style={styles.hint}>De la mercancía lista para salir o del transporte; al menos una.</Text>
      <AppUpload
        value={evidence}
        onChange={(files: UploadedFile[]) => {
          setServerError(null);
          setEvidence(files);
        }}
        multiple
        maxFiles={MAX_PHOTOS}
        accept="images"
        error={attempted && missingPhotos}
        helperText={attempted && missingPhotos ? "Sube al menos una foto del envío" : undefined}
      />
    </ListSection>
  );

  const footer = canShip ? (
    <FormFooter submitLabel="Enviar productos" onSubmit={ship} loading={sending} disabled={submitting} note={note} />
  ) : null;

  return (
    <TransferLayout
      header={header}
      main={
        <>
          {intro}
          {products}
          {photos}
        </>
      }
      side={side}
      footer={footer}
    />
  );
}

const makeStyles = themedStyles((c) => ({
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
}));
