import { useLocalSearchParams } from "expo-router";
import React from "react";
import SuppliersForm from "../form";

export default function EditSupplier() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <SuppliersForm id={parseInt(id, 10)} />;
}
