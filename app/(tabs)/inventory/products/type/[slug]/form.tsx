import { useLocalSearchParams } from "expo-router";
import React from "react";
import ProductsForm from "../../form";

/**
 * Alta de producto desde el listado de un tipo de inventario.
 *
 * La ruta lleva el tipo (/inventory/products/type/materia-prima/form) y el
 * formulario abre con ese tipo ya seleccionado.
 */
export default function NewProductOfType() {
  const { slug } = useLocalSearchParams();

  return <ProductsForm inventoryTypeSlug={slug as string} />;
}
