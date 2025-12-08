import { useLocalSearchParams } from "expo-router";
import React from "react";
import WorkersForm from "../form";

export default function Show() {
  const params = useLocalSearchParams<{ id: string }>();

  return <WorkersForm readonly id={Number(params.id)} />;
}
