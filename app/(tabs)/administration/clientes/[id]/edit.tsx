import { useLocalSearchParams } from "expo-router";
import React from "react";
import ClientsForm from "../form";

export default function EditClient() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ClientsForm id={parseInt(id, 10)} />;
}
