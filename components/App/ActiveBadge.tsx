import StatusBadge from "@/components/App/StatusBadge";
import { activeStatus } from "@/constants/statuses";
import React from "react";

interface ActiveBadgeProps {
  active: boolean;
  /** "Activa"/"Inactiva" (sucursal, categoría…) en lugar de "Activo". */
  feminine?: boolean;
}

/** Estado activo/inactivo de un registro en listas y tarjetas. */
export default function ActiveBadge({ active, feminine = false }: ActiveBadgeProps) {
  return <StatusBadge {...activeStatus(active, feminine)} />;
}
