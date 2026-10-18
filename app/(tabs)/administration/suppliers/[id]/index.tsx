import PartyDetail from "@/components/Administration/Catalogs/PartyDetail";
import { useLocalSearchParams } from "expo-router";
import React from "react";

/** Detalle de un proveedor (antes, el formulario en solo lectura). */
export default function SupplierDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PartyDetail kind="supplier" id={Number(id)} />;
}
