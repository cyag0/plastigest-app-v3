import { Redirect } from "expo-router";
import React from "react";

/** Ver home/inventory/index.tsx: el conteo vive en /inventory/weekly-inventory. */
export default function LegacyInventoryForm() {
  return <Redirect href="/inventory/weekly-inventory" />;
}
