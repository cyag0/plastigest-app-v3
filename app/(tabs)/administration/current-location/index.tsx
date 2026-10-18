import EmptyState from "@/components/App/EmptyState";
import LocationForm from "@/components/Administration/Locations/LocationForm";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import React from "react";

/**
 * Datos de la sucursal en la que se está trabajando: el mismo formulario de
 * Sucursales. Antes era una copia aparte, en tarjetas, con ciudad, estado,
 * país y código postal que el servidor no guarda (se perdían al guardar), y
 * con la dirección como opcional aunque el servidor la pide.
 */
export default function CurrentLocationScreen() {
  const { location } = useAuth();

  if (!location) {
    return (
      <EmptyState
        icon="store-outline"
        title="Elige una sucursal"
        description="Para cambiar sus datos, primero entra a la sucursal."
        actionLabel="Elegir sucursal"
        onAction={() => router.push("/(stacks)/selectLocation")}
      />
    );
  }

  return <LocationForm id={location.id} title="Datos de la sucursal" />;
}
