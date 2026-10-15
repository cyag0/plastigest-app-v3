import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

/** Ver home/inventory/index.tsx: el conteo vive en /inventory/weekly-inventory. */
export default function LegacyInventoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <Redirect href={`/inventory/weekly-inventory/${id}` as any} />;
}
