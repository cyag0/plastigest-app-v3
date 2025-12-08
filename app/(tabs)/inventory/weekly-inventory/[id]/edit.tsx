import { useLocalSearchParams } from "expo-router";
import React from "react";
import InventoryForm from "../form";

export default function InventoryEdit() {
  const { id } = useLocalSearchParams();

  return <InventoryForm id={Number(id)} readonly={false} />;
}
