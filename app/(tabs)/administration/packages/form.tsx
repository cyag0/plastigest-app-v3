import PackageForm, { type PackageFormProps } from "@/components/Products/PackageForm";
import React from "react";

/**
 * Paquete nuevo, editar y detalle (solo lectura) desde Administración →
 * Paquetes. El formulario es el mismo de Inventario → Paquetes; esta copia
 * no limitaba la unidad al tipo de la del producto y así se queda.
 */
export default function PackagesForm(props: Omit<PackageFormProps, "unitsOfProductType">) {
  return <PackageForm {...props} unitsOfProductType={false} />;
}
