import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import BarcodeScanner from "@/components/Form/BarcodeScanner";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
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
  company_id: Yup.number().required("La compañía es requerida"),
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
  is_active: Yup.boolean(),
  is_default: Yup.boolean(),
  sort_order: Yup.number(),
});

interface PackagesFormProps {
  id?: number;
  readonly?: boolean;
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

  console.log("PackagesForm packageId", packageId);

  // Función para generar código de barras aleatorio en el frontend
  const generateRandomBarcode = () => {
    // Generar un código de 13 dígitos (similar a EAN-13)
    const timestamp = Date.now().toString().slice(-8); // Últimos 8 dígitos del timestamp
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0"); // 5 dígitos aleatorios
    const barcode = timestamp + random; // 13 dígitos en total

    formRef.current?.setFieldValue("barcode", barcode);
    alerts.success("Código de barras generado");
  };

  if (!company) {
    alerts.error("Debe seleccionar una compañía antes de continuar.");
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
      initialValues={{
        product_id: 0,
        company_id: company?.id || undefined,
        package_name: "",
        barcode: "",
        quantity_per_package: 1,
        unit_id: null,
        purchase_price: 0,
        sale_price: 0,
        is_active: true,
        is_default: false,
        sort_order: 0,
      }}
      onSuccess={() => {
        router.back();
      }}
    >
      {/* Información básica del paquete */}
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
        fetchParams={{
          company_id: company.id,
        }}
      />

      <FormInput
        name="package_name"
        label="Nombre del Paquete"
        placeholder="Ej: Caja de 6, Display de 24"
        required
      />

      {/* Código de Barras con Escáner y Generador */}
      <View style={styles.codeInputContainer}>
        <View style={styles.codeInput}>
          <FormInput
            name="barcode"
            label="Código de Barras"
            placeholder="Código de barras del paquete"
            required
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
        fetchParams={{
          company_id: company.id,
        }}
      />

      {/* Precios */}
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

      {/* Configuración */}
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
  codeInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-end",
  },
  codeInput: {
    flex: 1,
  },
  scanButton: {
    marginBottom: 8,
  },
});
