import PartyDetail from "@/components/Administration/Catalogs/PartyDetail";
import { useLocalSearchParams } from "expo-router";
import React from "react";

/** Detalle de un cliente (antes, el formulario en solo lectura). */
export default function ClientDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PartyDetail kind="customer" id={Number(id)} />;
}
