import { ListGroup, ListValueRow, LIST_TEXT_INSET } from "@/components/App/ListGroup";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef, useAppForm } from "@/components/Form/AppForm/AppForm";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormUpload } from "@/components/Form/AppUpload";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import { FormRow, FormSection } from "@/components/Form/FormLayout";
import CodeField from "@/components/Products/CodeField";
import useInventoryTypes from "@/hooks/useInventoryTypes";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { formatQuantity } from "@/utils/format";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useMemo, useRef } from "react";
import * as Yup from "yup";

interface ProductFormData {
  name: string;
  description?: string;
  code: string;
  purchase_price?: string;
  sale_price?: string;
  company_id: number;
  category_id?: number;
  unit_id?: number;
  supplier_id?: number;
  inventory_type_id?: number;
  is_active: boolean;
  for_sale: boolean;
  // Campos de la tabla pivot product_location
  current_stock?: string;
  minimum_stock?: string;
  maximum_stock?: string;
  product_images?: any[]; // Para imágenes del producto
  attachments?: any[]; // Para documentos adicionales
  // Receta de envasado: el producto se obtiene envasando un granel y
  // consumiendo material. Se aplica al registrar la producción o al envasar.
  requires_packaging?: boolean;
  packaging_source_product_id?: number;
  packaging_source_quantity?: string;
  packaging_source_unit_id?: number;
  packaging_materials?: {
    material_product_id: number;
    unit_id: number;
    quantity: number;
    notes?: string;
  }[];
}

interface ProductsFormProps {
  id?: number;
  readonly?: boolean;
  /**
   * Slug del tipo de inventario con el que se entró (viene de la ruta
   * /inventory/products/type/[slug]/form). Deja el tipo precargado al crear.
   */
  inventoryTypeSlug?: string;
}

/** Vacío = sin valor (el campo es opcional); con algo escrito, un número ≥ 0. */
const optionalAmount = (typeMessage: string) =>
  Yup.number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined ? null : value,
    )
    .nullable()
    .typeError(typeMessage)
    .min(0, "No puede ser negativo");

const isOn = (value: unknown) => value === true || value === 1 || value === "1";

/**
 * Lo mismo que pide el backend (ProductController: nombre ≤ 150, código ≤ 50,
 * tipo obligatorio) más la unidad, sin la cual el producto no se puede
 * transferir ni convertir, y la receta de envasado: con el interruptor
 * encendido, envasar falla si no dice de qué granel ni cuánto lleva.
 */
const productSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre del producto")
    .max(150, "Usa 150 caracteres o menos"),
  code: Yup.string()
    .trim()
    .required("Escribe, escanea o genera un código")
    .max(50, "Usa 50 caracteres o menos"),
  inventory_type_id: Yup.number()
    .typeError("Elige el tipo de inventario")
    .required("Elige el tipo de inventario"),
  unit_id: Yup.number().typeError("Elige la unidad").required("Elige la unidad"),
  purchase_price: optionalAmount("Escribe solo el número, por ejemplo 38.50"),
  sale_price: optionalAmount("Escribe solo el número, por ejemplo 65"),
  minimum_stock: optionalAmount("Escribe una cantidad, por ejemplo 10"),
  maximum_stock: optionalAmount("Escribe una cantidad, por ejemplo 60"),
  packaging_source_product_id: Yup.mixed().when("requires_packaging", {
    is: isOn,
    then: () =>
      Yup.number()
        .typeError("Elige de qué granel se envasa")
        .required("Elige de qué granel se envasa"),
    otherwise: (schema) => schema.nullable(),
  }),
  packaging_source_quantity: Yup.mixed().when("requires_packaging", {
    is: isOn,
    then: () =>
      Yup.number()
        .typeError("Escribe cuánto granel lleva cada pieza, por ejemplo 1")
        .required("Escribe cuánto granel lleva cada pieza")
        .moreThan(0, "Escribe cuánto granel lleva cada pieza"),
    otherwise: (schema) => schema.nullable(),
  }),
});

export default function ProductsForm(props: ProductsFormProps) {
  const params = useLocalSearchParams();
  const productId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const formRef = useRef<AppFormRef<ProductFormData>>(null);

  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const { byId: inventoryTypesById, bySlug: inventoryTypesBySlug } =
    useInventoryTypes();

  // Al crear desde el listado de un tipo, ese tipo llega en la ruta y se deja
  // precargado. En edición no aplica: manda el tipo que ya tiene el producto.
  const presetTypeId = productId
    ? undefined
    : inventoryTypesBySlug[props.inventoryTypeSlug || ""]?.id;

  // El tipo elegido decide qué partes aplican (proveedor, presentación).
  const typeOf = (value: unknown) =>
    value ? inventoryTypesById[Number(value)] : undefined;

  // En el teléfono el título va en la barra (en web, la ruta de migas).
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      title: props.readonly
        ? "Producto"
        : productId
          ? "Editar producto"
          : "Nuevo producto",
    });
  }, [navigation, props.readonly, productId]);

  useEffect(() => {
    setTimeout(() => {
      formRef.current?.setFieldValue(
        "current_location_id",
        selectedLocation?.id || ""
      );
    }, 500);
  }, []);

  // AppForm hace resetForm cada vez que cambia la identidad de initialValues,
  // así que se memoriza: si no, cualquier re-render (cargar los tipos, girar la
  // pantalla) borraría lo que el usuario ya escribió.
  const initialValues = useMemo(
    () => ({
      company_id: company?.id || undefined,
      location_id: selectedLocation?.id || undefined,
      inventory_type_id: presetTypeId, // precargado desde la ruta, si viene
      requires_packaging: false, // El paso de empaque se activa por producto
      packaging_materials: [], // Material que consume cada unidad al empacarse
      for_sale: true, // Por defecto disponible para venta
      current_location_id: selectedLocation?.id || undefined,
      is_active: true, // Por defecto activo en la sucursal
      current_stock: "0", // Stock inicial
      minimum_stock: "0", // Stock mínimo por defecto
      maximum_stock: "", // Stock máximo opcional
    }),
    [company?.id, selectedLocation?.id, presetTypeId]
  );

  return (
    <AppForm
      permissionPrefix="products"
      deletePermission="products_delete"
      ref={formRef}
      api={Services.products}
      id={productId}
      readonly={props.readonly}
      validationSchema={productSchema}
      submitButtonText={productId ? "Guardar cambios" : "Guardar producto"}
      successMessage="Producto guardado"
      onSuccess={() => {
        goBack();
      }}
      initialValues={initialValues}
    >
      {/* Lo que identifica al producto. */}
      <FormSection>
        <FormInput
          name="name"
          label="Nombre"
          placeholder="Agua de coco 1 L"
          maxLength={150}
        />
        <CodeField
          name="code"
          label="Código"
          maxLength={50}
          hint="El de la etiqueta: escríbelo, escanéalo o genera uno."
        />
        <FormInput
          name="description"
          label="Descripción"
          optional
          multiline
          numberOfLines={2}
        />
      </FormSection>

      <FormSection
        title="Clasificación"
        description="El tipo define si el producto se compra, se produce o se vende."
      >
        <FormRow>
          {/* selectedLabelField: el nombre que trae el producto. Sin permiso
              para listar el catálogo, el select no lo pide y muestra ese
              nombre. */}
          <FormProSelect
            name="inventory_type_id"
            label="Tipo de inventario"
            model="inventoryTypes"
            placeholder="Elige el tipo"
            selectedLabelField="inventory_type.name"
          />
          <FormProSelect
            model="home.unidades"
            name="unit_id"
            label="Unidad"
            placeholder="Elige la unidad"
            selectedLabelField="unit.name"
            fetchParams={{
              only_base: true,
            }}
            hint={
              productId
                ? "No cambia si ya tiene existencia o movimientos."
                : "En la que se lleva la existencia."
            }
          />
        </FormRow>

        {/* El proveedor sólo aplica a los tipos que se compran. */}
        <AppDependency name="inventory_type_id">
          {(value) => (
            <FormRow>
              <FormProSelect
                name="category_id"
                label="Categoría"
                optional
                model="categories"
                placeholder="Sin categoría"
                selectedLabelField="category_name"
              />
              {typeOf(value)?.is_purchasable ? (
                <FormProSelect
                  name="supplier_id"
                  label="Proveedor"
                  optional
                  model="suppliers"
                  placeholder="Sin proveedor"
                  selectedLabelField="supplier_name"
                  hint="Aparece en su catálogo al registrar una compra."
                />
              ) : null}
            </FormRow>
          )}
        </AppDependency>
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
            hint="El del punto de venta y el kiosco."
          />
        </FormRow>
        <FormSwitch
          name="for_sale"
          text="Disponible para venta"
          description="Se vende suelto. Si lo apagas, solo se venden sus paquetes con precio."
        />
      </FormSection>

      {/* Presentación: lo que se envasa de un granel. Cómo se hace el granel
          va en Producción → Procesos; aquí, en qué se envasa (antes había
          además una "Receta" que nada usaba). */}
      <AppDependency name="inventory_type_id">
        {(value) =>
          typeOf(value)?.is_producible ? (
            <FormSection
              title="Presentación"
              description="Si se envasa de un granel: de cuál, cuánto lleva cada pieza y qué material usa."
            >
              <FormSwitch
                name="requires_packaging"
                text="Se envasa de un granel"
                description="Botella, bolsa o galón. Se envasa al registrar la producción o desde «Envasar granel»."
              />

              {/* El resto sólo aparece cuando hay algo que empacar. */}
              <AppDependency name="requires_packaging">
                {(requiresPackaging) =>
                  requiresPackaging ? <PackagingFields /> : null
                }
              </AppDependency>
            </FormSection>
          ) : null
        }
      </AppDependency>

      <PhotosSection />

      <FormSection
        title={`En ${selectedLocation?.name || "esta sucursal"}`}
        description={
          productId
            ? "Existencia y niveles para reponer en esta sucursal."
            : "La existencia empieza en 0 y se suma con compras, producción o ajustes."
        }
      >
        {!!productId && <CurrentStock />}
        <FormRow>
          <FormInput
            name="minimum_stock"
            label="Existencia mínima"
            optional
            placeholder="0"
            keyboardType="decimal-pad"
            inputMode="decimal"
            hint="Se avisa cuando la existencia baja de aquí."
          />
          <FormInput
            name="maximum_stock"
            label="Existencia máxima"
            optional
            placeholder="Sin tope"
            keyboardType="decimal-pad"
            inputMode="decimal"
            hint="Lo más que se sugiere tener al reponer."
          />
        </FormRow>
        <FormSwitch
          name="is_active"
          text="Activo en esta sucursal"
          description="Si lo apagas, deja de aparecer en esta sucursal."
        />
      </FormSection>
    </AppForm>
  );
}

/**
 * Receta de envasado: de qué granel sale el producto, cuánto granel lleva cada
 * pieza y qué material se consume (botella, tapa, etiqueta).
 *
 * El granel se filtra por el tipo "Semiterminado (granel)" y el material por
 * "Material de empaque": así el empaque no se mezcla con los ingredientes.
 */
function PackagingFields() {
  const { readonly } = useAppForm();
  return (
    <>
      <FormProSelect
        name="packaging_source_product_id"
        label="Se envasa de"
        model="products"
        placeholder="Elige el granel"
        fetchParams={{ inventory_type_code: "semi_finished" }}
        selectedLabelField="packaging_source_product.name"
      />

      <FormRow>
        <FormInput
          name="packaging_source_quantity"
          label="Contenido por pieza"
          keyboardType="decimal-pad"
          inputMode="decimal"
          hint="Cuánto granel lleva cada pieza."
        />
        <FormProSelect
          name="packaging_source_unit_id"
          label="Unidad del contenido"
          optional
          model="home.unidades"
          placeholder="La del granel"
          selectedLabelField="packaging_source_unit.name"
        />
      </FormRow>

      <EditableTable
        name="packaging_materials"
        label="Material de empaque"
        columns={readonly ? PACKAGING_MATERIAL_COLUMNS_READONLY : PACKAGING_MATERIAL_COLUMNS}
        defaultRow={DEFAULT_PACKAGING_MATERIAL}
        addLabel="Agregar material"
        emptyMessage="Agrega lo que lleva cada pieza: botella, tapa, etiqueta, caja…"
      />
    </>
  );
}

/**
 * Sólo productos del tipo "Material de empaque". Sin `required` en las
 * columnas: lo obligatorio ya no lleva asterisco (el backend descarta los
 * renglones sin material). Los anchos llenan la columna del formulario (678
 * dentro del borde); al editar, la tabla agrega 60 para el botón de quitar.
 */
const materialColumns = (widths: [number, number, number, number]): EditableTableColumn[] => [
  {
    key: "material_product_id",
    label: "Material",
    type: "product",
    width: widths[0],
    productFetchParams: { inventory_type_code: "packaging_material" },
    labelKey: "material_name",
  },
  {
    key: "unit_id",
    label: "Unidad",
    type: "unit",
    width: widths[1],
    labelKey: "unit_name",
  },
  {
    key: "quantity",
    label: "Por pieza",
    type: "number",
    width: widths[2],
  },
  { key: "notes", label: "Notas", type: "text", width: widths[3] },
];

const PACKAGING_MATERIAL_COLUMNS = materialColumns([220, 120, 110, 168]);
const PACKAGING_MATERIAL_COLUMNS_READONLY = materialColumns([260, 130, 110, 178]);

const DEFAULT_PACKAGING_MATERIAL = {
  material_product_id: 0,
  unit_id: 0,
  quantity: 0,
  notes: "",
};

/**
 * Fotos del producto. No tienen etiqueta propia (la sección se llama así),
 * por eso lo opcional va en la descripción; en el detalle sin fotos dice
 * "Sin fotos".
 */
function PhotosSection() {
  const { readonly } = useAppForm();
  const { values } = useFormikContext<ProductFormData>();
  const hasPhotos =
    Array.isArray(values.product_images) && values.product_images.length > 0;

  return (
    <FormSection
      title="Fotos"
      description={
        readonly
          ? undefined
          : "Opcional. Se ven en el punto de venta, el kiosco y la lista de productos."
      }
    >
      {readonly && !hasPhotos ? (
        <ReadonlyText text="" />
      ) : (
        <FormUpload
          name="product_images"
          placeholder="Toma o elige hasta 5 fotos"
          multiple
          maxFiles={5}
          accept="images"
        />
      )}
    </FormSection>
  );
}

/** Existencia de la sucursal (no se edita: cambia con los movimientos). */
function CurrentStock() {
  const { values } = useFormikContext<
    ProductFormData & { unit?: { abbreviation?: string } }
  >();
  return (
    <ListGroup inset={LIST_TEXT_INSET} style={{ marginBottom: 18 }}>
      <ListValueRow
        label="Existencia actual"
        value={formatQuantity(values.current_stock, values.unit?.abbreviation)}
      />
    </ListGroup>
  );
}
