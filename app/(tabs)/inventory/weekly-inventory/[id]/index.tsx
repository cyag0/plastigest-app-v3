import { useLocalSearchParams } from "expo-router";
import React from "react";
import InventoryForm from "../form";

export default function InventoryDetail() {
  const { id } = useLocalSearchParams();

  return <InventoryForm id={Number(id)} readonly={true} />;
}
