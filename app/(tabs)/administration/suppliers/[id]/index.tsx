import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import SuppliersForm from "../form";

export default function SupplierDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const supplierId = params.id as string;

  return <SuppliersForm id={parseInt(supplierId)} readonly />;
}
