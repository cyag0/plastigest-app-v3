import { useLocalSearchParams } from "expo-router";
import React from "react";
import SalesReportsForm from "./form";

export default function Show() {
  const params = useLocalSearchParams<{ id: string }>();

  return <SalesReportsForm readonly id={Number(params.id)} />;
}
