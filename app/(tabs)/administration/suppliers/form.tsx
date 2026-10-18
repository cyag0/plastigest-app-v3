import PartyForm from "@/components/Administration/Catalogs/PartyForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";

/** Nuevo proveedor (y, desde [id]/edit, editar uno). */
export default function SuppliersForm(props: { id?: number }) {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = props.id ?? (params.id ? parseInt(params.id, 10) : undefined);
  return <PartyForm kind="supplier" id={id} />;
}
