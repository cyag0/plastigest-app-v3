import { useLocalSearchParams } from "expo-router";
import React from "react";
import UnidadForm from "../form";

export default function UnidadEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <UnidadForm id={id ? parseInt(id, 10) : undefined} />;
}
