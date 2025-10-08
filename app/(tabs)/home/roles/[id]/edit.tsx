import { useLocalSearchParams } from "expo-router";
import React from "react";
import CreateRoleScreen from "../form";

export default function EditRoleScreen() {
  const params = useLocalSearchParams<{ id: string }>();

  return <CreateRoleScreen id={Number(params.id)} />;
}
