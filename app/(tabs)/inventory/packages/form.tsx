import PackageForm, { type PackageFormProps } from "@/components/Products/PackageForm";
import React from "react";

/**
 * Paquete nuevo, editar y detalle (solo lectura) desde Inventario → Paquetes.
 * El formulario es el mismo de Administración → Paquetes.
 */
export default function PackagesForm(props: Omit<PackageFormProps, "unitsOfProductType">) {
  return <PackageForm {...props} />;
}
