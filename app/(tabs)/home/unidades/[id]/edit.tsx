import { useLocalSearchParams } from "expo-router";
import React from "react";
import UnidadForm from "../form";

export default function UnidadEditScreen() {
  const params = useLocalSearchParams();
  const id = params.id ? parseInt(params.id as string) : undefined;

  return <UnidadForm id={id} />;
}