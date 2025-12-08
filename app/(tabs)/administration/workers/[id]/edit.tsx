import { useLocalSearchParams } from "expo-router";
import React from "react";
import WorkersForm from "../form";

export default function edit() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  return <WorkersForm id={parseInt(id)} readonly={false} />;
}
