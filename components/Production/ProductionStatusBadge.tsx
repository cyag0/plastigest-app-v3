import StatusBadge from "@/components/App/StatusBadge";
import { productionStatus } from "@/constants/statuses";
import React from "react";

interface Props {
  status: string;
  label?: string;
}

/**
 * El empaque es un paso posterior a la producción, con estado propio:
 * borrador → producción terminada → en empaque → empacada.
 */
export default function ProductionStatusBadge({ status, label }: Props) {
  const info = productionStatus(status);
  return <StatusBadge tone={info.tone} label={label ?? info.label} />;
}
