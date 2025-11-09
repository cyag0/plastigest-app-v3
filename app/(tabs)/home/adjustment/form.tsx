import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Divider, IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface ProductDetail {
  product_id: number;
  product_name?: string;
  quantity: string;
  unit_price: string;
  current_stock?: number;
}

type AdjustmentType = App.Entities.Adjustment.AdjustmentType;

interface AdjustmentFormData {
  location_id: number;
  company_id: number;
  movement_date: string;
  document_number?: string;
  comments?: string;
  adjustment_type: AdjustmentType;
  reason?: string;
  adjusted_by?: string;
  details: ProductDetail[];
}

export default function AdjustmentForm() {
  const router = useRouter();
  const alerts = useAlerts();
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<AdjustmentFormData>>(null);

  const handleAddProduct = () => {};

  const handleRemoveProduct = (index: number) => {};

  return (
    <AppForm
      ref={formRef}
      api={Services.movements.adjustments}
      initialValues={{
        location_id: selectedLocation?.id || 0,
        company_id: company?.id || 0,
        movement_date: new Date().toISOString().split("T")[0],
        adjustment_type: "increment",
        details: [],
      }}
      validationSchema={Yup.object().shape({
        location_id: Yup.number().required("La sucursal es obligatoria"),
        movement_date: Yup.string().required(
          "La fecha del ajuste es obligatoria"
        ),
        adjustment_type: Yup.string()
          .oneOf(["increment", "decrement", "return", "damage", "loss"])
          .required("El tipo de ajuste es obligatorio"),
        details: Yup.array()
          .of(
            Yup.object().shape({
              product_id: Yup.string().required("El producto es obligatorio"),
              quantity: Yup.number()
                .min(0.01, "La cantidad debe ser al menos 0.01")
                .required("La cantidad es obligatoria"),
              unit_price: Yup.number()
                .min(0, "El precio unitario no puede ser negativo")
                .required("El precio unitario es obligatorio"),
            })
          )
          .min(1, "Debe agregar al menos un producto al ajuste"),
      })}
    >
      <FormSelectSimple
        name="adjustment_type"
        label="Tipo de Ajuste"
        required
        data={[
          { label: "Incremento (Entrada)", value: "increment" },
          { label: "Decremento (Salida)", value: "decrement" },
          { label: "Retorno", value: "return" },
          { label: "Daño", value: "damage" },
          { label: "Pérdida", value: "loss" },
        ]}
      />

      <FormDatePicker name="movement_date" label="Fecha del Ajuste" required />

      <FormInput
        name="content.comments"
        label="Comentarios"
        placeholder="Observaciones adicionales"
        multiline
        numberOfLines={3}
      />

      <Divider style={{ marginVertical: 16 }} />

      <ProductsList />
    </AppForm>
  );
}

function ProductsList() {
  const form = useFormikContext<AdjustmentFormData>();

  console.log(form.values.details);

  function handleAddProduct() {
    const newProduct: ProductDetail = {
      product_id: 0,
      quantity: "0",
      unit_price: "0",
    };

    form.setFieldValue("details", [...form.values.details, newProduct]);
  }

  function handleRemoveProduct(index: number) {
    const updatedProducts = [...form.values.details];
    updatedProducts.splice(index, 1);
    form.setFieldValue("details", updatedProducts);
  }

  const products = form.values.details || [];

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
          Productos
        </Text>
        <Button
          mode="contained"
          onPress={handleAddProduct}
          icon="plus"
          buttonColor={palette.primary}
        >
          Agregar Producto
        </Button>
      </View>

      {products.length === 0 && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={{ textAlign: "center", opacity: 0.6 }}>
              No hay productos agregados
            </Text>
          </Card.Content>
        </Card>
      )}

      {products.map((product, index) => (
        <ProductCard
          key={index}
          product={product}
          index={index}
          adjustmentType={form.values.adjustment_type}
          onRemove={() => handleRemoveProduct(index)}
        />
      ))}
    </>
  );
}

interface ProductCardProps {
  product: ProductDetail;
  index: number;
  onRemove: () => void;
  adjustmentType: AdjustmentType;
}

function ProductCard({
  product,
  index,
  onRemove,
  adjustmentType,
}: ProductCardProps) {
  const quantity = parseFloat(product.quantity) || 0;
  const unitPrice = parseFloat(product.unit_price) || 0;
  const total = quantity * unitPrice;

  return (
    <Card style={styles.productCard}>
      <Card.Content>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons
              name="package-variant"
              size={20}
              color={palette.primary}
            />
            <Text variant="titleSmall" style={{ fontWeight: "bold" }}>
              Producto #{index + 1}
            </Text>
          </View>
          <IconButton
            icon="delete"
            size={20}
            iconColor={palette.error}
            onPress={onRemove}
          />
        </View>

        <FormProSelect
          name={`details.${index}.product_id`}
          label="Producto"
          model="products"
          placeholder="Seleccione un producto"
          required
        />

        <Text
          variant="bodySmall"
          style={{ color: palette.textSecondary, marginBottom: 8 }}
        >
          Nota: Ingrese manualmente el stock y precio
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <FormNumeric
              name={`details.${index}.quantity`}
              label="Cantidad"
              keyboardType="numeric"
              mode="outlined"
              dense
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput
              name={`details.${index}.unit_price`}
              label="Precio Unitario"
              keyboardType="numeric"
              mode="outlined"
              dense
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: palette.background,
            padding: 12,
            borderRadius: 4,
            marginTop: 12,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <Text variant="bodyMedium" style={{ fontWeight: "bold" }}>
            Total:
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              fontWeight: "bold",
              color:
                adjustmentType === "increase" ? palette.success : palette.error,
            }}
          >
            {adjustmentType === "increase" ? "+" : "-"}${total.toFixed(2)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  productCard: {
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
  },
  errorCard: {
    borderWidth: 2,
    borderColor: palette.error,
  },
  emptyCard: {
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
});
