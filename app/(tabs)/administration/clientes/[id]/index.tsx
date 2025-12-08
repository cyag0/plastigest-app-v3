import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import ClientsForm from "../form";

export default function ClientDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clientId = params.id as string;

  return <ClientsForm id={parseInt(clientId)} readonly />;
}
