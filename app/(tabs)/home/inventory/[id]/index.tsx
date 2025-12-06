import React from "react";
import { useLocalSearchParams } from "expo-router";
import InventoryForm from "../form";

export default function InventoryDetail() {
  const { id } = useLocalSearchParams();

  return <InventoryForm id={Number(id)} readonly={true} />;
}
