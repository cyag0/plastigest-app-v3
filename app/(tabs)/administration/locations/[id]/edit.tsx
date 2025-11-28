import { useLocalSearchParams } from "expo-router";
import React from "react";
import LocationFormScreen from "../form";

export default function edit() {
  const params = useLocalSearchParams();
  const id = params.id as string;

  return <LocationFormScreen id={parseInt(id)} readonly={false} />;
}
