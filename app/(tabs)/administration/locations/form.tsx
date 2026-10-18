import LocationForm from "@/components/Administration/Locations/LocationForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";

/** Nueva sucursal; con ?id= edita esa (igual que [id]/edit). */
export default function LocationFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : undefined;

  return <LocationForm id={id} />;
}
