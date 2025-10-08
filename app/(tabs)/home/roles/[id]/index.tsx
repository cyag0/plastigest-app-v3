import { useLocalSearchParams } from "expo-router";
import React from "react";
import CreateRoleScreen from "../form";

export default function Show() {
  const params = useLocalSearchParams<{ id: string }>();

  return <CreateRoleScreen readonly id={Number(params.id)} />;
}
