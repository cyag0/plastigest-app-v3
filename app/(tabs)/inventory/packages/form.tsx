import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import BarcodeScanner from "@/components/Form/BarcodeScanner";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface PackageFormData {
  product_id: number;
  company_id: number;
  package_name: string;
  barcode: string;
  quantity_per_package: number;
  unit_id?: number | null;
  purchase_price?: number | null;
  sale_price?: number | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

const validationSchema = Yup.object().shape({
  product_id: Yup.number().required("El producto es requerido"),
  package_name: Yup.string().required("El nombre del paquete es requerido"),
  barcode: Yup.string().required("El código de barras es requerido"),
  quantity_per_package: Yup.number()
    .required("La cantidad por paquete es requerida")
    .min(0.01, "La cantidad debe ser mayor a 0"),
  unit_id: Yup.number().nullable(),
  purchase_price: Yup.number()
    .nullable()
    .min(0, "El precio no puede ser negativo"),
  sale_price: Yup.number().nullable().min(0, "El precio no puede ser negativo"),
});

interface PackagesFormProps {
  id?: number;
  readonly?: boolean;
}

// Watches product_id from Formik context and reports the product's unit_type.
// Must render inside FormikProvider (inside AppForm children).
function UnitTypeWatcher({
  products,
  onUnitTypeChange,
}: {
  products: any[];
  onUnitTypeChange: (type: string | null) => void;
}) {
  const { values } = useFormikContext<PackageFormData>();

  useEffect(() => {
    if (!values.product_id || products.length === 0) {
      onUnitTypeChange(null);
      return;
    }
    const product = products.find(
      (p) => Number(p.id) === Number(values.product_id)
    );
    onUnitTypeChange(product?.unit?.unit_type ?? null);
  }, [values.product_id, products]);

  return null;
}

export default function PackagesForm(props: PackagesFormProps) {
  const params = useLocalSearchParams();
  const packageId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!packageId;
  const formRef = useRef<AppFormRef<PackageFormData>>(null);
  const scannerRef = useRef<any>(null);
  const { company } = useSelectedCompany();
  const alerts = useAlerts();

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [productUnitType, setProductUnitType] = useState<string | null>(null);

  // Stable reference — prevents loadInitialValues from re-running on every render.
  const initialValues = useMemo(
    () => ({
      company_id: company?.id,
      is_active: true,
      is_default: false,
      sort_order: 0,
    }),
    [company?.id]
  );

  const generateRandomBarcode = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    formRef.current?.setFieldValue("barcode", timestamp + random);
    alerts.success("Código de barras generado");
  };

  if (!company) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Debe seleccionar una compañía primero.</Text>
      </View>
    );
  }

  return (
    <AppForm
      ref={formRef}
      api={Services.productPackages}
      id={packageId}
      readonly={props?.readonly || false}
      validationSchema={validationSchema}
      onSuccess={() => {
        router.back();
      }}
      initialValues={initialValues}
    >
      {/* Syncs product_id → productUnitType state (must be inside FormikProvider) */}
      <UnitTypeWatcher
        products={allProducts}
        onUnitTypeChange={setProductUnitType}
      />

      <Text
        variant="titleMedium"
        style={{ marginBottom: 16, fontWeight: "bold" }}
      >
        Información del Paquete
      </Text>

      <FormProSelect
        name="product_id"
        label="Producto"
        model="products"
        placeholder="Seleccione un producto"
        required
        fetchParams={{ company_id: company.id }}
        onDataLoaded={setAllProducts}
        onChange={() => {
          // Clear unit when product changes so stale unit type isn't kept.
          formRef.current?.setFieldValue("unit_id", null);
        }}
      />

      <FormInput
        name="package_name"
        label="Nombre del Paquete"
        placeholder="Ej: Caja de 6, Display de 24"
        required
      />

      {/* Código de Barras — label lives outside the row so buttons align with the input */}
      <View style={styles.barcodeSectionContainer}>
        <InputLabel label="Código de Barras" required={true} />
        <View style={styles.codeInputContainer}>
          <View style={styles.codeInput}>
            <FormInput
              name="barcode"
              placeholder="Código de barras del paquete"
              required
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <IconButton
            icon="barcode-scan"
            mode="contained"
            containerColor={palette.primary}
            iconColor="#fff"
            size={24}
            onPress={() => scannerRef.current?.open()}
            style={styles.scanButton}
          />
          <IconButton
            icon="auto-fix"
            mode="contained"
            containerColor={palette.accent}
            iconColor="#fff"
            size={24}
            onPress={generateRandomBarcode}
            style={styles.scanButton}
          />
        </View>
      </View>

      <BarcodeScanner
        ref={scannerRef}
        onScanned={(code) => {
          formRef.current?.setFieldValue("barcode", code);
        }}
      />

      <FormNumeric
        name="quantity_per_package"
        label="Cantidad por Paquete"
        placeholder="Ej: 6, 12, 24"
        required
      />

      <FormProSelect
        name="unit_id"
        label="Unidad de Medida"
        model="home.unidades"
        placeholder="Seleccione una unidad"
        filterItem={
          productUnitType
            ? (item: any) => item.unit_type === productUnitType
            : undefined
        }
      />

      <Text
        variant="titleMedium"
        style={{ marginTop: 24, marginBottom: 16, fontWeight: "bold" }}
      >
        Precios (Opcional)
      </Text>

      <FormNumeric
        name="purchase_price"
        label="Precio de Compra"
        placeholder="0.00"
      />

      <FormNumeric
        name="sale_price"
        label="Precio de Venta"
        placeholder="0.00"
      />

      <Text
        variant="titleMedium"
        style={{ marginTop: 24, marginBottom: 16, fontWeight: "bold" }}
      >
        Configuración
      </Text>

      <FormCheckBox name="is_active" text="Paquete Activo" />

      <FormCheckBox name="is_default" text="Usar como empaque por defecto" />

      <FormNumeric
        name="sort_order"
        label="Orden de Visualización"
        placeholder="0"
      />
    </AppForm>
  );
}

const styles = StyleSheet.create({
  barcodeSectionContainer: {
    marginBottom: 16,
  },
  codeInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  codeInput: {
    flex: 1,
  },
  // marginBottom: 16 aligns button center with the TextInput center.
  // Breakdown: AppInput marginVertical(8) + HOC containerStyle marginBottom(0)
  // → button needs 16px bottom margin to center with the text field.
  scanButton: {
    marginBottom: 16,
  },
});
