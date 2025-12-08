import { useLocalSearchParams } from "expo-router";
import React from "react";
import ClientsForm from "../form";

export default function EditClient() {
  const { id } = useLocalSearchParams();

  return <ClientsForm id={parseInt(id as string)} />;
}
