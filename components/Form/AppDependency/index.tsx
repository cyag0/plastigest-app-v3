import { getIn, useFormikContext } from "formik";
import React from "react";

interface AppDependencyProps {
  name: string;
  children: (value: any) => React.ReactNode;
}

/**
 * Componente que observa un campo específico del formulario Formik
 * y pasa su valor actual a los children como render prop.
 *
 * @param name - Nombre del campo a observar (soporta rutas anidadas como "user.address.street")
 * @param children - Función que recibe el valor actual y retorna JSX
 *
 * @example
 * ```tsx
 * <AppDependency name="product_type">
 *   {(productType) => (
 *     productType === "processed" && (
 *       <IngredientsTable name="ingredients" />
 *     )
 *   )}
 * </AppDependency>
 * ```
 */
export default function AppDependency({ name, children }: AppDependencyProps) {
  const { values } = useFormikContext();
  const value = getIn(values, name);

  return <>{children(value)}</>;
}
