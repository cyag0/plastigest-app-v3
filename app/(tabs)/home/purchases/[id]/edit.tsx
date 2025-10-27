import { useLocalSearchParams } from "expo-router";
import React from "react";
import PurchasesForm from "../form";

export default function EditPurchase() {
  const params = useLocalSearchParams();
  const purchaseId = parseInt(params.id as string);

  return <PurchasesForm id={purchaseId} />;
}
