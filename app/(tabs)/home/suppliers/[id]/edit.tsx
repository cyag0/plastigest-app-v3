import { useLocalSearchParams } from "expo-router";
import React from "react";
import SuppliersForm from "../form";

export default function EditSupplier() {
  const { id } = useLocalSearchParams();

  return <SuppliersForm id={parseInt(id as string)} />;
}