/**
 * La transferencia ya terminada (completada, rechazada o cancelada): de cada
 * producto lo aprobado, lo enviado y lo recibido, y si faltó algo, cuánto,
 * el motivo, qué pasó, las fotos y el ajuste que se generó (se abre desde
 * aquí). Al lado van las fotos de cada paso, las notas y el historial.
 *
 * Antes eran tres tarjetas de "Paso N" que repetían los mismos productos,
 * totales que sumaban piezas con kilos y una línea de tiempo aparte.
 */

import EmptyState from "@/components/App/EmptyState";
import { TransferLayout, TransferProducts } from "@/components/Transfers/TransferDetailParts";
import TransferLineRow from "@/components/Transfers/TransferLineRow";
import { lineIncident, lineShortage, lineStages, type TransferLine } from "@/components/Transfers/transferFormat";
import type { InventoryTransfer } from "@/utils/services/transferService";
import React from "react";

interface Props {
  transfer: InventoryTransfer;
  header: React.ReactNode;
  intro?: React.ReactNode;
  side: React.ReactNode;
  /** Cómo abrir el ajuste de un faltante; undefined si no se puede ver desde aquí. */
  adjustmentOpener?: (adjustmentId: number) => (() => void) | undefined;
}

export default function TransferStepFourSummary({ transfer, header, intro, side, adjustmentOpener }: Props) {
  const lines = (transfer.details ?? []) as TransferLine[];
  const showThumbs = lines.some((line) => !!line.product?.main_image);

  const products = (
    <TransferProducts count={lines.length}>
      {lines.length === 0 ? (
        <EmptyState compact icon="package-variant" title="Sin productos" />
      ) : (
        lines.map((line) => {
          const shortage = lineShortage(transfer, line);
          const incident = shortage > 0 ? lineIncident(transfer, line) : null;
          const adjustmentId = incident?.adjustmentId;
          return (
            <TransferLineRow
              key={line.id}
              line={line}
              thumb={showThumbs}
              stages={lineStages(transfer, line)}
              shortage={shortage}
              incident={incident}
              onOpenAdjustment={adjustmentId ? adjustmentOpener?.(adjustmentId) : undefined}
            />
          );
        })
      )}
    </TransferProducts>
  );

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
    />
  );
}
