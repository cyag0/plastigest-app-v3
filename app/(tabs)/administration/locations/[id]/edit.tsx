import LocationForm from "@/components/Administration/Locations/LocationForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditLocationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <LocationForm id={Number(id)} />;
}
