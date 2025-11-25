import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, {
  AppFormRef,
  useAppForm,
} from "@/components/Form/AppForm/AppForm";
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
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Divider, IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface AdjustmentFormProps {
  id?: number;
  readonly?: boolean;
}

interface ProductDetail {
  product_id: number;
  product_name?: string;
  quantity: string;
  unit_id?: number;
  current_stock?: number;
  previous_stock?: number;
  new_stock?: number;
}

type AdjustmentType = App.Entities.Adjustment.AdjustmentType;

interface AdjustmentFormData {
  location_id: number;
  company_id: number;
  movement_date: string;
  movement_reason: AdjustmentType;
  content: {
    comments?: string;
  };
  details: ProductDetail[];
}

export default function AdjustmentForm(props: AdjustmentFormProps) {
  const readonly = props.readonly || false;

  const router = useRouter();
  const alerts = useAlerts();
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<AdjustmentFormData>>(null);

  const handleAddProduct = () => {};

  const handleRemoveProduct = (index: number) => {};

  return (
    <AppForm
      readonly={props.readonly}
      id={props.id}
      ref={formRef}
      showButtons={!readonly}
      api={Services.movements.adjustments}
      initialValues={{
        location_id: selectedLocation?.id || 0,
        company_id: company?.id || 0,
        movement_date: new Date().toISOString().split("T")[0],
        movement_reason: "adjustment",
        content: {
          comments: "",
        },
        details: [],
      }}
      validationSchema={Yup.object().shape({
        location_id: Yup.number().required("La sucursal es obligatoria"),
        movement_date: Yup.string().required(
          "La fecha del ajuste es obligatoria"
        ),
        movement_reason: Yup.string()
          .oneOf(["adjustment", "return", "damage", "loss", "shrinkage"])
          .required("El tipo de ajuste es obligatorio"),
        details: Yup.array()
          .of(
            Yup.object().shape({
              product_id: Yup.string().required("El producto es obligatorio"),
              quantity: Yup.number()
                .min(0.01, "La cantidad debe ser al menos 0.01")
                .required("La cantidad es obligatoria"),
              unit_id: Yup.number().required("La unidad es obligatoria"),
            })
          )
          .min(1, "Debe agregar al menos un producto al ajuste"),
      })}
      onSuccess={() => {
        router.back();
      }}
    >
      <FormSelectSimple
        name="movement_reason"
        label="Tipo de Ajuste"
        required
        data={[
          { label: "Ajuste de Inventario", value: "adjustment" },
          { label: "Retorno", value: "return" },
          { label: "Daño", value: "damage" },
          { label: "Pérdida", value: "loss" },
          { label: "Merma", value: "shrinkage" },
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
  const formContext = useAppForm();

  console.log(form.values.details);

  function handleAddProduct() {
    const newProduct: ProductDetail = {
      product_id: 0,
      quantity: "0",
      unit_id: undefined,
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
        {!formContext.readonly && (
          <Button
            mode="contained"
            onPress={handleAddProduct}
            icon="plus"
            buttonColor={palette.primary}
          >
            Agregar Producto
          </Button>
        )}
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
          adjustmentType={form.values.movement_reason}
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

function ProductCard({ index, onRemove, adjustmentType }: ProductCardProps) {
  const form = useFormikContext<AdjustmentFormData>();
  const [productData, setProductData] = useState<any>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const alerts = useAlerts();

  const formContext = useAppForm();

  // Flag para mostrar advertencia visual sin causar re-render del form
  const [showStockWarning, setShowStockWarning] = useState(false);

  const productId = form.values.details[index]?.product_id;

  // Usar useEffect para cargar el producto y sus unidades
  useEffect(() => {
    const loadProductData = async () => {
      if (!productId || productId === 0) {
        setProductData(null);
        setAvailableUnits([]);
        return;
      }

      try {
        setLoading(true);
        const response = await Services.products.show(Number(productId));
        const product = response.data.data;

        setProductData(product);

        // Establecer las unidades disponibles
        if (product.available_units) {
          setAvailableUnits(product.available_units);
        }

        // Auto-seleccionar la unidad base del producto si no hay una seleccionada
        if (product.unit_id && !form.values.details[index]?.unit_id) {
          form.setFieldValue(`details.${index}.unit_id`, product.unit_id);
        }

        console.log("Product loaded:", product);
        console.log("Available units:", product.available_units);
      } catch (error) {
        console.error("Error loading product:", error);
        alerts.error("Error al cargar el producto");
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId]); // Solo re-ejecutar cuando cambie el product_id

  // Calcular conversión y stock resultante
  const quantity = parseFloat(form.values.details[index]?.quantity || "0");
  const selectedUnitId = form.values.details[index]?.unit_id;
  const currentStock = productData?.current_stock || 0;
  const isIncrement = adjustmentType === "adjustment"; // Solo 'adjustment' puede ser incremento

  // Obtener información de la unidad seleccionada
  const selectedUnit = availableUnits.find((u) => u.id === selectedUnitId);
  const baseUnit = productData?.unit;

  // Calcular cantidad en unidad base
  let quantityInBaseUnit = quantity;
  let conversionText = "";

  if (selectedUnit && baseUnit) {
    if (selectedUnit.base_unit_id === null) {
      // Es la unidad base
      quantityInBaseUnit = quantity;
      conversionText = `${quantity} ${selectedUnit.abbreviation}`;
    } else {
      // Es una unidad derivada, convertir a base
      const factor = parseFloat(selectedUnit.factor_to_base || 1);
      quantityInBaseUnit = quantity * factor;
      conversionText = `${quantity} ${selectedUnit.abbreviation} = ${quantityInBaseUnit} ${baseUnit.abbreviation}`;
    }
  }

  const resultingStock = isIncrement
    ? currentStock + quantityInBaseUnit
    : currentStock - quantityInBaseUnit;

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
            {loading && (
              <Text variant="bodySmall" style={{ color: palette.primary }}>
                Cargando...
              </Text>
            )}
          </View>
          {!formContext.readonly && (
            <IconButton
              icon="delete"
              size={20}
              iconColor={palette.error}
              onPress={onRemove}
            />
          )}
        </View>

        <FormProSelect
          name={`details.${index}.product_id`}
          label="Producto"
          model="products"
          placeholder="Seleccione un producto"
          required
        />

        <View
          style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}
        >
          <View style={{ flex: 1 }}>
            <FormSelectSimple
              name={`details.${index}.unit_id`}
              label="Unidad"
              required
              data={availableUnits.map((unit) => ({
                label: `${unit.name} (${unit.abbreviation})`,
                value: unit.id.toString(),
              }))}
              disabled={loading || availableUnits.length === 0}
            />
          </View>

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {!formContext.readonly && (
              <IconButton
                icon="minus"
                size={24}
                onPress={() => {
                  const currentQuantity = parseFloat(
                    form.values.details[index]?.quantity || "0"
                  );
                  if (currentQuantity > 0) {
                    const newQuantity = currentQuantity - 1;

                    // Validar que el stock resultante no sea negativo en decrementos
                    if (!isIncrement) {
                      const newQuantityInBaseUnit =
                        selectedUnit?.base_unit_id === null
                          ? newQuantity
                          : newQuantity *
                            parseFloat(selectedUnit?.factor_to_base || 1);

                      if (currentStock - newQuantityInBaseUnit < 0) {
                        setShowStockWarning(true);
                        return;
                      }
                    }

                    form.setFieldValue(
                      `details.${index}.quantity`,
                      newQuantity.toString()
                    );
                    setShowStockWarning(false);
                  }
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <FormNumeric
                name={`details.${index}.quantity`}
                label="Cantidad"
                keyboardType="numeric"
                dense
                onChange={(value) => {
                  const numValue = parseFloat(value || "0");

                  // Validar que no sea menor a 0
                  if (numValue < 0) {
                    form.setFieldValue(`details.${index}.quantity`, "0");
                    setShowStockWarning(false);
                    return;
                  }

                  // Validar que el stock resultante no sea negativo en decrementos
                  if (!isIncrement && productData) {
                    const quantityInBaseUnit =
                      selectedUnit?.base_unit_id === null
                        ? numValue
                        : numValue *
                          parseFloat(selectedUnit?.factor_to_base || 1);

                    if (currentStock - quantityInBaseUnit < 0) {
                      setShowStockWarning(true);
                      // No revertir el valor, solo mostrar advertencia
                      return;
                    }
                  }

                  setShowStockWarning(false);
                }}
              />
            </View>
            {!formContext.readonly && (
              <IconButton
                icon="plus"
                size={24}
                onPress={() => {
                  const currentQuantity = parseFloat(
                    form.values.details[index]?.quantity || "0"
                  );
                  const newQuantity = currentQuantity + 1;

                  // Validar que el stock resultante no sea negativo en decrementos
                  if (!isIncrement && productData) {
                    const newQuantityInBaseUnit =
                      selectedUnit?.base_unit_id === null
                        ? newQuantity
                        : newQuantity *
                          parseFloat(selectedUnit?.factor_to_base || 1);

                    if (currentStock - newQuantityInBaseUnit < 0) {
                      setShowStockWarning(true);
                      return;
                    }
                  }

                  form.setFieldValue(
                    `details.${index}.quantity`,
                    newQuantity.toString()
                  );
                  setShowStockWarning(false);
                }}
              />
            )}
          </View>
        </View>

        {/* Mostrar conversión si aplica */}
        {conversionText &&
          selectedUnit &&
          selectedUnit.base_unit_id !== null && (
            <View
              style={{
                backgroundColor: palette.primary + "15",
                padding: 8,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              <Text
                variant="bodySmall"
                style={{ color: palette.primary, fontWeight: "bold" }}
              >
                Conversión: {conversionText}
              </Text>
            </View>
          )}

        {/* Mostrar stock actual y resultante */}
        {productData && !formContext.readonly && (
          <View
            style={{
              backgroundColor:
                resultingStock < 0 || showStockWarning
                  ? palette.error + "15"
                  : palette.background,
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              gap: 8,
              borderWidth: resultingStock < 0 || showStockWarning ? 1 : 0,
              borderColor:
                resultingStock < 0 || showStockWarning
                  ? palette.error
                  : "transparent",
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary }}
              >
                Stock actual:
              </Text>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: "bold", color: palette.textSecondary }}
              >
                {currentStock} {baseUnit?.abbreviation || "unidades"}
              </Text>
            </View>
            {(resultingStock < 0 || showStockWarning) && (
              <View
                style={{
                  backgroundColor: palette.error + "20",
                  padding: 8,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={palette.error}
                />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.error, fontWeight: "bold", flex: 1 }}
                >
                  Stock insuficiente. No puede restar más de lo disponible.
                </Text>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary }}
              >
                Stock resultante:
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <MaterialCommunityIcons
                  name={isIncrement ? "arrow-up" : "arrow-down"}
                  size={16}
                  color={isIncrement ? palette.primary : palette.error}
                />
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: "bold",
                    color: isIncrement ? palette.primary : palette.error,
                    fontSize: 16,
                  }}
                >
                  {resultingStock} {baseUnit?.abbreviation || "unidades"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Mostrar información de stock guardado cuando es readonly */}
        {formContext.readonly &&
          form.values.details[index]?.previous_stock !== undefined && (
            <View
              style={{
                backgroundColor: palette.background,
                padding: 12,
                borderRadius: 8,
                marginTop: 12,
                gap: 8,
                borderWidth: 1,
                borderColor: palette.primary + "30",
              }}
            >
              <Text
                variant="titleSmall"
                style={{
                  color: palette.primary,
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                Información del Ajuste
              </Text>

              {/* Cantidad ajustada */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: palette.textSecondary }}
                >
                  Cantidad ajustada:
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ fontWeight: "bold", color: palette.text }}
                >
                  {form.values.details[index].quantity}{" "}
                  {selectedUnit?.abbreviation || baseUnit?.abbreviation || ""}
                </Text>
              </View>

              <Divider style={{ marginVertical: 4 }} />

              {/* Stock anterior */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: palette.textSecondary }}
                >
                  Stock anterior:
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ fontWeight: "bold", color: palette.textSecondary }}
                >
                  {form.values.details[index].previous_stock}{" "}
                  {baseUnit?.abbreviation || "unidades"}
                </Text>
              </View>

              {/* Stock nuevo */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  variant="bodyMedium"
                  style={{ color: palette.textSecondary }}
                >
                  Stock resultante:
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MaterialCommunityIcons
                    name={isIncrement ? "arrow-up" : "arrow-down"}
                    size={16}
                    color={isIncrement ? palette.primary : palette.error}
                  />
                  <Text
                    variant="bodyMedium"
                    style={{
                      fontWeight: "bold",
                      color: isIncrement ? palette.primary : palette.error,
                      fontSize: 16,
                    }}
                  >
                    {form.values.details[index].new_stock}{" "}
                    {baseUnit?.abbreviation || "unidades"}
                  </Text>
                </View>
              </View>
            </View>
          )}
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
