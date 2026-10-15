import { Redirect } from "expo-router";
import React from "react";

/**
 * Pantallas anteriores del inventario semanal. El conteo vive en
 * /inventory/weekly-inventory; estas rutas ya no tienen enlace y su
 * formulario guardaba la existencia que la pantalla cargó al abrir (y 0 al
 * marcar "incorrecto"), lo que metía ajustes fantasma al completar. Se
 * redirigen por si alguien tenía la dirección guardada.
 */
export default function LegacyInventoryIndex() {
  return <Redirect href="/inventory/weekly-inventory" />;
}
