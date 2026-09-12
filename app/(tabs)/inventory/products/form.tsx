import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormUpload } from "@/components/Form/AppUpload";
import BarcodeScanner from "@/components/Form/BarcodeScanner";
import EditableTable, {
  EditableTableColumn,
} from "@/components/Form/EditableTable/EditableTable";
import IngredientsTable from "@/components/Form/IngredientsTable/IngredientsTable";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import useInventoryTypes from "@/hooks/useInventoryTypes";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { useWindowDimensions, View } from "react-native";
import { Icon, IconButton, Text } from "react-native-paper";

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
  ingredients?: {
    ingredient_id: number;
    quantity: number;
    notes?: string;
  }[];
  // Receta de empaque: el producto se obtiene empacando un granel y
  // consumiendo material. Se ejecuta en producción, ya terminado el proceso.
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

export default function ProductsForm(props: ProductsFormProps) {
  const params = useLocalSearchParams();
  const productId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const formRef = useRef<AppFormRef<ProductFormData>>(null);
  const scannerRef = useRef<any>(null);

  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useFormStyles();
  const { byId: inventoryTypesById, bySlug: inventoryTypesBySlug } =
    useInventoryTypes();

  // Al crear desde el listado de un tipo, ese tipo llega en la ruta y se deja
  // precargado. En edición no aplica: manda el tipo que ya tiene el producto.
  const presetTypeId = productId
    ? undefined
    : inventoryTypesBySlug[props.inventoryTypeSlug || ""]?.id;

  // A partir de tablet los campos se acomodan en rejilla; en móvil se apilan.
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  // Función para generar código de barras aleatorio en el frontend
  const generateRandomBarcode = () => {
    // Generar un código de 13 dígitos (similar a EAN-13)
    const timestamp = Date.now().toString().slice(-8); // Últimos 8 dígitos del timestamp
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0"); // 5 dígitos aleatorios
    const barcode = timestamp + random; // 13 dígitos en total

    formRef.current?.setFieldValue("code", barcode);
  };

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
      ingredients: [], // Array vacío por defecto
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
      ref={formRef}
      api={Services.products}
      id={productId}
      readonly={props.readonly}
      onSuccess={() => {
        router.back();
      }}
      initialValues={initialValues}
    >
      {/* ───────────────── Identificación ───────────────── */}
      <Section
        icon="tag-outline"
        color={colors.primary}
        title="Identificación"
        subtitle="Cómo se llama y cómo se identifica el producto"
      >
        <FormInput
          name="name"
          label="Nombre del Producto"
          placeholder="Ej: Bolsa Plástica 20x30cm"
          required
        />

        <View style={styles.codeInputContainer}>
          <View style={styles.codeInput}>
            <FormInput
              name="code"
              label="Código del Producto"
              placeholder="Ej: BP-2030"
              required
              //@ts-ignore
              readonly
            />
          </View>
          <IconButton
            icon="barcode-scan"
            mode="contained"
            containerColor={colors.primary}
            iconColor={colors.primaryForeground}
            size={22}
            onPress={() => scannerRef.current?.open()}
            style={styles.scanButton}
          />
          <IconButton
            icon="auto-fix"
            mode="contained"
            containerColor={colors.surfaceMuted}
            iconColor={colors.textSecondary}
            size={22}
            onPress={generateRandomBarcode}
            style={styles.scanButton}
          />
        </View>

        <FormInput
          name="description"
          label="Descripción"
          placeholder="Descripción del producto"
          multiline
          numberOfLines={2}
        />

        <BarcodeScanner
          ref={scannerRef}
          onScanned={(code) => {
            formRef.current?.setFieldValue("code", code);
          }}
        />
      </Section>

      {/* ───────────────── Clasificación ───────────────── */}
      <Section
        icon="shape-outline"
        color={colors.info}
        title="Clasificación"
        subtitle="El tipo de inventario define qué se puede hacer con el producto"
      >
        <Row isWide={isWide} styles={styles}>
          <Field isWide={isWide} styles={styles}>
            <FormProSelect
              name="inventory_type_id"
              label="Tipo de Inventario"
              model="inventoryTypes"
              placeholder="Seleccione un tipo de inventario"
              required
            />
          </Field>

          <Field isWide={isWide} styles={styles}>
            <FormProSelect
              name="category_id"
              label="Categoría"
              model="categories"
              placeholder="Seleccione una categoría"
            />
          </Field>

          <Field isWide={isWide} styles={styles}>
            <FormProSelect
              model="home.unidades"
              name="unit_id"
              label="Unidad de Medida"
              placeholder="Seleccione una unidad de medida"
              required
              fetchParams={{
                only_base: true,
              }}
            />
          </Field>

          {/* El proveedor sólo aplica a los tipos que se compran. */}
          <AppDependency name="inventory_type_id">
            {(value) => {
              const type = value ? inventoryTypesById[Number(value)] : undefined;

              if (!type?.is_purchasable) return null;

              return (
                <Field isWide={isWide} styles={styles}>
                  <FormProSelect
                    name="supplier_id"
                    label="Proveedor"
                    model="suppliers"
                    placeholder="Seleccione un proveedor (opcional)"
                  />
                </Field>
              );
            }}
          </AppDependency>
        </Row>
      </Section>

      {/* ───────────────── Precios ───────────────── */}
      <Section
        icon="cash-multiple"
        color={colors.warning}
        title="Precios"
        subtitle="Costo de adquisición y precio al público"
      >
        <Row isWide={isWide} styles={styles}>
          <Field isWide={isWide} styles={styles}>
            <FormInput
              name="purchase_price"
              label="Precio de Compra"
              placeholder="0.00"
              keyboardType="numeric"
            />
          </Field>

          <Field isWide={isWide} styles={styles}>
            <FormInput
              name="sale_price"
              label="Precio de Venta"
              placeholder="0.00"
              keyboardType="numeric"
            />
          </Field>
        </Row>

        <FormSwitch name="for_sale" text="Producto Disponible para Venta" />
      </Section>

      {/* ───────────── Receta: sólo lo que se fabrica ───────────── */}
      <AppDependency name="inventory_type_id">
        {(value) => {
          const type = value ? inventoryTypesById[Number(value)] : undefined;

          if (!type?.is_producible) return null;

          return (
            <Section
              icon="flask-outline"
              color={colors.chart4}
              title="Receta"
              subtitle={`Insumos que se consumen para producir ${type.name.toLowerCase()}`}
            >
              <IngredientsTable
                name="ingredients"
                label="Ingredientes"
                required
              />
            </Section>
          );
        }}
      </AppDependency>

      {/* ───────── Empaque: sólo lo que se fabrica y se empaca ───────── */}
      <AppDependency name="inventory_type_id">
        {(value) => {
          const type = value ? inventoryTypesById[Number(value)] : undefined;

          if (!type?.is_producible) return null;

          return (
            <Section
              icon="package-variant-closed"
              color={colors.info}
              title="Empaque"
              subtitle="Qué se consume al empacar una unidad. El empaque se registra en producción, después de terminar el proceso"
            >
              <FormSwitch
                name="requires_packaging"
                text="Este producto se empaca"
              />

              {/* El resto sólo aparece cuando hay algo que empacar. */}
              <AppDependency name="requires_packaging">
                {(requiresPackaging) =>
                  requiresPackaging ? (
                    <PackagingFields isWide={isWide} styles={styles} />
                  ) : null
                }
              </AppDependency>
            </Section>
          );
        }}
      </AppDependency>

      {/* ───────────────── Imágenes ───────────────── */}
      <Section
        icon="image-multiple-outline"
        color={colors.chart5}
        title="Imágenes"
        subtitle="Hasta 5 fotos (JPG, PNG)"
      >
        <FormUpload
          name="product_images"
          label="Imágenes del producto"
          placeholder="Subir fotos del producto"
          multiple
          maxFiles={5}
          accept="images"
        />
      </Section>

      {/* ───────────────── Stock en la sucursal ───────────────── */}
      <Section
        icon="warehouse"
        color={colors.success}
        title={`Inventario en ${selectedLocation?.name || "esta sucursal"}`}
        subtitle="Existencia actual y niveles de reposición"
      >
        <FormSwitch
          name="is_active"
          text={`Producto Activo en ${
            selectedLocation?.name || "esta sucursal"
          }`}
        />

        <Row isWide={isWide} styles={styles}>
          <Field isWide={isWide} styles={styles} span="third">
            <FormInput
              name="current_stock"
              label="Stock Actual"
              placeholder="0.00"
              keyboardType="numeric"
              //@ts-ignore
              readonly
            />
          </Field>

          <Field isWide={isWide} styles={styles} span="third">
            <FormInput
              name="minimum_stock"
              label="Stock Mínimo"
              placeholder="0.00"
              keyboardType="numeric"
            />
          </Field>

          <Field isWide={isWide} styles={styles} span="third">
            <FormInput
              name="maximum_stock"
              label="Stock Máximo"
              placeholder="0.00"
              keyboardType="numeric"
            />
          </Field>
        </Row>
      </Section>

      <View style={{ display: "none" }}>
        <FormInput name="current_location_id" />
      </View>
    </AppForm>
  );
}

/**
 * Receta de empaque: de qué granel sale el producto, cuánto granel lleva cada
 * unidad y qué material se consume (frasco, tapa, etiqueta).
 *
 * El granel se filtra por `is_producible` porque siempre es una salida de una
 * fórmula, y el material por el tipo `packaging_material`.
 */
function PackagingFields({
  isWide,
  styles,
}: {
  isWide: boolean;
  styles: FormStyles;
}) {
  return (
    <View style={{ marginTop: tokens.spacing[3] }}>
      <Row isWide={isWide} styles={styles}>
        <Field isWide={isWide} styles={styles}>
          <FormProSelect
            name="packaging_source_product_id"
            label="Se empaca a partir de"
            model="products"
            placeholder="Granel del que sale (opcional)"
            fetchParams={{ is_producible: 1 }}
          />
        </Field>

        <Field isWide={isWide} styles={styles} span="third">
          <FormInput
            name="packaging_source_quantity"
            label="Granel por unidad"
            placeholder="0.00"
            keyboardType="numeric"
          />
        </Field>

        <Field isWide={isWide} styles={styles} span="third">
          <FormProSelect
            name="packaging_source_unit_id"
            label="Unidad del granel"
            model="home.unidades"
            placeholder="Unidad"
          />
        </Field>
      </Row>

      <EditableTable
        name="packaging_materials"
        label="Material de empaque"
        columns={PACKAGING_MATERIAL_COLUMNS}
        defaultRow={DEFAULT_PACKAGING_MATERIAL}
        addLabel="Agregar material"
        emptyMessage="Agrega el material que lleva cada unidad: frasco, tapa, etiqueta, caja…"
      />
    </View>
  );
}

/** Sólo productos del tipo "Material de empaque". */
const PACKAGING_MATERIAL_COLUMNS: EditableTableColumn[] = [
  {
    key: "material_product_id",
    label: "Material",
    type: "product",
    width: 230,
    required: true,
    productFetchParams: { inventory_type_code: "packaging_material" },
  },
  { key: "unit_id", label: "Unidad", type: "unit", width: 110, required: true },
  {
    key: "quantity",
    label: "Cantidad por unidad",
    type: "number",
    width: 160,
    required: true,
  },
  { key: "notes", label: "Notas", type: "text", width: 180 },
];

const DEFAULT_PACKAGING_MATERIAL = {
  material_product_id: 0,
  unit_id: 0,
  quantity: 0,
  notes: "",
};

type FormStyles = ReturnType<typeof useFormStyles>;

/**
 * Bloque del formulario con encabezado. Agrupa campos relacionados para que la
 * pantalla se lea de un vistazo en vez de ser una columna larga de inputs.
 */
function Section(props: {
  icon: string;
  color: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const styles = useFormStyles();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[styles.sectionIcon, { backgroundColor: props.color + "1F" }]}
        >
          <Icon source={props.icon} size={18} color={props.color} />
        </View>

        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>{props.title}</Text>
          {!!props.subtitle && (
            <Text style={styles.sectionSubtitle}>{props.subtitle}</Text>
          )}
        </View>
      </View>

      <View style={styles.sectionBody}>{props.children}</View>
    </View>
  );
}

/** Contenedor de la rejilla: acomoda los Field en filas cuando hay ancho. */
function Row(props: {
  isWide: boolean;
  styles: FormStyles;
  children: React.ReactNode;
}) {
  return (
    <View style={props.isWide ? props.styles.row : props.styles.rowStacked}>
      {props.children}
    </View>
  );
}

/**
 * Celda de la rejilla. `half` (por defecto) ocupa media fila y `third` un
 * tercio. En móvil todo pasa a una sola columna.
 */
function Field(props: {
  isWide: boolean;
  styles: FormStyles;
  span?: "half" | "third";
  children: React.ReactNode;
}) {
  if (!props.isWide) {
    return <View style={props.styles.fieldFull}>{props.children}</View>;
  }

  return (
    <View
      style={
        props.span === "third" ? props.styles.fieldThird : props.styles.fieldHalf
      }
    >
      {props.children}
    </View>
  );
}

function useFormStyles() {
  return useThemedStyles((colors) => ({
    section: {
      backgroundColor: colors.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: tokens.spacing[5],
      paddingTop: tokens.spacing[4],
      paddingBottom: tokens.spacing[4],
      marginBottom: tokens.spacing[4],
      ...tokens.shadow.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingBottom: tokens.spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionTitle: {
      ...tokens.typography.h3,
      color: colors.text,
    },
    sectionSubtitle: {
      ...tokens.typography.caption,
      color: colors.textSecondary,
    },
    sectionBody: {
      paddingTop: tokens.spacing[1],
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: tokens.spacing[4],
    },
    rowStacked: {
      flexDirection: "column",
    },
    fieldFull: {
      width: "100%",
    },
    fieldHalf: {
      flexGrow: 1,
      flexBasis: "45%",
      minWidth: 220,
    },
    fieldThird: {
      flexGrow: 1,
      flexBasis: "28%",
      minWidth: 150,
    },
    codeInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
    },
    codeInput: {
      flex: 1,
    },
    scanButton: {
      margin: 0,
    },
  }));
}
