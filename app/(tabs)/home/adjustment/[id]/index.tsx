import { useLocalSearchParams } from "expo-router";
import React from "react";
import AdjustmentForm from "../form";

export default function index() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  return <AdjustmentForm id={parseInt(id)} readonly />;
}
