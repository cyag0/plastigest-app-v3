import { useLocalSearchParams } from "expo-router";
import React from "react";
import UnidadForm from "../form";

export default function UnidadDetailScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <UnidadForm id={id ? parseInt(id as string) : undefined} readonly={true} />
  );
}
