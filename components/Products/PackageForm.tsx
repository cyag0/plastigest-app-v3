/**
 * Paquete de un producto ("Paquete de 8 duraznitos"): su código de barras,
 * cuánto del producto trae y sus precios. Lo abren Inventario → Paquetes y
 * Administración → Paquetes (cada sección con sus rutas); antes cada una
 * tenía su copia del formulario.
 *
 * Lo que dice el backend (ProductPackageController):
 * - El producto no se cambia al editar (update no lo acepta).
 * - La cantidad va en la unidad del producto: vender, comprar o transferir un
 *   paquete mueve cantidad × la unidad del producto.
 * - Sin precio de venta, se cobra el del producto por la cantidad
 *   (SalePricing::catalogPrice).
 * - La cantidad no cambia si el producto ya tiene existencia o movimientos
 *   (422 package_in_use).
 */

import EmptyState from "@/components/App/EmptyState";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import CodeField from "@/components/Products/CodeField";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TextInput } from "react-native-paper";
import * as Yup from "yup";

interface PackageFormData {
  product_id: number;
  company_id: number;
  package_name: string;
  barcode: string;
  quantity_per_package: number;
  unit_id?: number | null;
  purchase_price?: number | string | null;
  sale_price?: number | string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface PackageFormProps {
  id?: number;
  readonly?: boolean;
  /**
   * La unidad del paquete solo ofrece las del mismo tipo que la del producto
   * (pieza, decena, docena para uno por pieza) y se borra al cambiar de
   * producto. Así lo hacía la copia de Inventario; la de Administración no.
   */
  unitsOfProductType?: boolean;
}

/** Vacío = sin precio; con algo escrito, un número ≥ 0. */
const optionalPrice = Yup.number()
  .transform((value, original) =>
    original === "" || original === null || original === undefined ? null : value,
  )
  .nullable()
  .typeError("Escribe solo el número, por ejemplo 85")
  .min(0, "No puede ser negativo");

// Límites del backend: nombre y código ≤ 100, cantidad ≥ 0.01, orden entero.
const validationSchema = Yup.object().shape({
  product_id: Yup.number().typeError("Elige el producto").required("Elige el producto"),
  package_name: Yup.string()
    .trim()
    .required("Escribe el nombre del paquete")
    .max(100, "Usa 100 caracteres o menos"),
  barcode: Yup.string()
    .trim()
    .required("Escribe, escanea o genera el código")
    .max(100, "Usa 100 caracteres o menos"),
  quantity_per_package: Yup.number()
    .typeError("Escribe cuánto trae el paquete")
    .required("Escribe cuánto trae el paquete")
    .min(0.01, "Debe ser mayor que 0"),
  unit_id: Yup.number().nullable(),
  purchase_price: optionalPrice,
  sale_price: optionalPrice,
  sort_order: Yup.number().nullable().integer("Usa un número entero, por ejemplo 1"),
});

type Product = { id: number; name?: string; unit?: { abbreviation?: string; unit_type?: string } | null };

/**
 * Avisa qué producto está elegido (con su unidad), con el catálogo que ya
 * cargó el select. Va dentro de AppForm (necesita el contexto de Formik).
 */
function SelectedProductWatcher({
  products,
  onChange,
}: {
  products: Product[];
  onChange: (product: Product | null) => void;
}) {
  const { values } = useFormikContext<PackageFormData>();

  useEffect(() => {
    const product = values.product_id
      ? products.find((p) => Number(p.id) === Number(values.product_id))
      : undefined;
    onChange(product ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.product_id, products]);

  return null;
}

export default function PackageForm({ id, readonly, unitsOfProductType = true }: PackageFormProps) {
  const params = useLocalSearchParams();
  const packageId = id || (params.id ? parseInt(params.id as string) : undefined);
  const formRef = useRef<AppFormRef<PackageFormData>>(null);
  const { company } = useSelectedCompany();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const unitType = unitsOfProductType ? product?.unit?.unit_type ?? null : null;
  const unitAbbreviation = product?.unit?.abbreviation;

  // Referencia estable: AppForm recarga los valores si cambia.
  const initialValues = useMemo(
    () => ({
      company_id: company?.id,
      is_active: true,
      is_default: false,
      sort_order: 0,
    }),
    [company?.id],
  );

  if (!company) {
    return (
      <EmptyState
        icon="domain"
        title="Primero elige una empresa"
        description="Los paquetes son de los productos de la empresa que tengas elegida."
      />
    );
  }

  return (
    <AppForm
      permissionPrefix="products"
      deletePermission="products_delete"
      ref={formRef}
      api={Services.productPackages}
      id={packageId}
      readonly={readonly || false}
      validationSchema={validationSchema}
      submitButtonText={packageId ? "Guardar cambios" : "Guardar paquete"}
      successMessage="Paquete guardado"
      onSuccess={() => {
        goBack();
      }}
      initialValues={initialValues}
    >
      <SelectedProductWatcher products={allProducts} onChange={setProduct} />

      <FormSection>
        <FormProSelect
          name="product_id"
          label="Producto"
          model="products"
          placeholder="Elige el producto"
          fetchParams={{ company_id: company.id }}
          selectedLabelField="product.name"
          onDataLoaded={setAllProducts}
          // Al editar, el backend no cambia el producto: se ve, pero no se elige.
          disabled={!!packageId}
          hint={packageId ? "No se cambia. Para otro producto, crea un paquete nuevo." : undefined}
          onChange={() => {
            // Una unidad de otro tipo no le queda al producto nuevo.
            if (unitsOfProductType) formRef.current?.setFieldValue("unit_id", null);
          }}
        />

        <FormInput
          name="package_name"
          label="Nombre"
          placeholder="Paquete de 8"
          maxLength={100}
        />

        <CodeField
          name="barcode"
          label="Código de barras"
          maxLength={100}
          hint="El del paquete: escríbelo, escanéalo o genera uno."
        />

        <FormRow>
          <FormNumeric
            // El campo es un FastField: sin volver a montarlo no toma la
            // unidad, que llega después (al cargar los productos).
            key={`qty-${unitAbbreviation ?? "none"}`}
            name="quantity_per_package"
            label="Cantidad por paquete"
            right={unitAbbreviation ? <TextInput.Affix text={unitAbbreviation} /> : undefined}
            hint={
              packageId
                ? "No cambia si el producto ya tiene existencia o movimientos."
                : "En la unidad del producto."
            }
          />
          <FormProSelect
            // Al cambiar el tipo permitido el select se vuelve a montar para
            // tomar el filtro nuevo (FastField no lo propagaría).
            key={`unit-${unitType ?? "all"}`}
            name="unit_id"
            label="Unidad"
            optional
            model="home.unidades"
            placeholder="Sin unidad"
            selectedLabelField="unit.name"
            filterItem={unitType ? (item: any) => item.unit_type === unitType : undefined}
            hint="Solo de referencia."
          />
        </FormRow>
      </FormSection>

      <FormSection title="Precios">
        <FormRow>
          <FormInput
            name="purchase_price"
            label="Precio de compra"
            optional
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputMode="decimal"
            hint="Se propone al comprar si no hay un precio anterior."
          />
          <FormInput
            name="sale_price"
            label="Precio de venta"
            optional
            placeholder="0.00"
            keyboardType="decimal-pad"
            inputMode="decimal"
            hint="Vacío: el del producto por la cantidad."
          />
        </FormRow>
      </FormSection>

      <FormSection title="Opciones">
        <FormSwitch
          name="is_default"
          text="Paquete principal"
          description="Solo uno por producto: al marcarlo, los demás dejan de serlo."
        />
        <FormNumeric
          name="sort_order"
          label="Orden"
          optional
          placeholder="0"
          keyboardType="number-pad"
          inputMode="numeric"
          hint="Los paquetes del producto se muestran de menor a mayor."
        />
        <FormSwitch
          name="is_active"
          text="Activo"
          description="Aparece al vender, comprar y transferir."
        />
      </FormSection>
    </AppForm>
  );
}
