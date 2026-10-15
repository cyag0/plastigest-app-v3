import { helpHref } from "@/help";
import { Redirect } from "expo-router";
import React from "react";

// La guía del log ahora es la sección "Estados" de la ayuda de transferencias.
export default function TransferLogGuideScreen() {
  return <Redirect href={helpHref("transferencias", "estados")} />;
}
