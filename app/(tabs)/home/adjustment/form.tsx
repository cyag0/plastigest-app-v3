import AppForm, {
  AppFormRef,
  useAppForm,
} from "@/components/Form/AppForm/AppForm";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppUpload, { UploadedFile } from "@/components/Form/AppUpload";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Button, Card, Divider, IconButton, Text, Chip } from "react-native-paper";
import * as Yup from "yup";

interface AdjustmentFormProps {
  id?: number;
  readonly?: boolean;
}

interface AdjustmentDetailItem {
  product_id: number;
  direction: "in" | "out";
  quantity: string;
  unit_id?: number;
  reason_code: string;
  notes?: string;
  evidence?: UploadedFile[];
  previous_stock?: number;
  new_stock?: number;
}

interface AdjustmentFormData {
  location_id: number;
  applied_at: string;
  notes: string;
  details: AdjustmentDetailItem[];
}

export default function AdjustmentForm(props: AdjustmentFormProps) {
  const readonly = props.readonly || false;

  const router = useRouter();
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<AdjustmentFormData>>(null);

  return (
    <AppForm
      readonly={props.readonly}
      id={props.id}
      ref={formRef}
      showButtons={!readonly}
      api={Services.inventoryAdjustments}
      initialValues={{
        location_id: selectedLocation?.id || 0,
        applied_at: new Date().toISOString().slice(0, 10),
        notes: "",
        details: [
          {
            product_id: 0,
            direction: "out",
            quantity: "0",
            unit_id: undefined,
            reason_code: "other",
            notes: undefined,
            evidence: [],
          },
        ],
      }}
      validationSchema={Yup.object().shape({
        location_id: Yup.number().required("La sucursal es obligatoria"),
        applied_at: Yup.string().required("La fecha es obligatoria"),
        details: Yup.array()
          .of(
            Yup.object().shape({
              product_id: Yup.number().required("El producto es obligatorio"),
              direction: Yup.string().oneOf(["in", "out"]).required("La dirección es obligatoria"),
              quantity: Yup.number()
                .min(0.01, "La cantidad debe ser al menos 0.01")
                .required("La cantidad es obligatoria"),
              unit_id: Yup.number().required("La unidad es obligatoria"),
              reason_code: Yup.string()
                .oneOf(["loss", "damage", "count_diff", "expiry", "theft", "found", "other"])
                .required("La razón del detalle es obligatoria"),
            })
          )
          .min(1, "Debe agregar al menos un producto al ajuste"),
      })}
      onSuccess={() => {
        router.back();
      }}
    >
      <FormDatePicker name="applied_at" label="Fecha del ajuste" required />

     {/*  <FormInput
        name="notes"
        label="Notas"
        placeholder="Observaciones adicionales"
        multiline
        numberOfLines={3}
      /> */}

      <Divider style={{ marginVertical: 16 }} />

      <ProductsList />
    </AppForm>
  );
}

function ProductsList() {
  const form = useFormikContext<AdjustmentFormData>();
  const formContext = useAppForm();

  function handleAddProduct() {
    const newProduct: AdjustmentDetailItem = {
      product_id: 0,
      direction: "out",
      quantity: "0",
      unit_id: undefined,
      reason_code: "other",
      notes: undefined,
      evidence: [],
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
    <ScrollView>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text variant="titleMedium" style={{ fontWeight: "bold" }}>
          Productos ({products.length})
        </Text>
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
          onRemove={() => handleRemoveProduct(index)}
        />
      ))}

      {!formContext.readonly && (
        <Button
          mode="contained"
          onPress={handleAddProduct}
          icon="plus"
          buttonColor={palette.primary}
          style={{ marginTop: 8, marginBottom: 24 }}
        >
          Agregar producto
        </Button>
      )}
    </ScrollView>
  );
}

interface ProductCardProps {
  product: AdjustmentDetailItem;
  index: number;
  onRemove: () => void;
}

function ProductCard({ index, onRemove }: ProductCardProps) {
  const form = useFormikContext<AdjustmentFormData>();
  const [productData, setProductData] = useState<any>(null);
  const [availableUnits, setAvailableUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const formContext = useAppForm();

  const productId = form.values.details[index]?.product_id;
  const direction = form.values.details[index]?.direction || "out";

  // Cargar datos del producto cuando cambia el product_id
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

        const productUnitId = Number(product.unit_id || product.unit?.id || 0);
        // Traer solo unidades compatibles con la unidad del producto.
        const groupedUnitsResponse = await Services.home.unidades.getGroupedByBase({
          unit_id: productUnitId,
        });
        const groupedUnits = groupedUnitsResponse?.data || {};

        let compatibleUnits: any[] = [];
        const groups = Object.values(groupedUnits);
        if (groups.length > 0 && Array.isArray(groups[0])) {
          compatibleUnits = groups[0] as any[];
        }

        // Fallback por tipo si no hay conversiones configuradas por base.
        if (compatibleUnits.length === 0 && product?.unit?.unit_type) {
          const groupedByTypeResponse = await Services.home.unidades.getGroupedByType();
          const groupedByType = groupedByTypeResponse?.data || {};
          compatibleUnits = groupedByType[product.unit.unit_type] || [];
        }

        // Fallback para endpoints antiguos
        if (compatibleUnits.length === 0 && Array.isArray(product.available_units)) {
          compatibleUnits = product.available_units;
        }

        setAvailableUnits(compatibleUnits);

        // Auto-seleccionar unidad base del producto cuando cambia el producto
        const defaultUnit = compatibleUnits.find((u: any) => Number(u.id) === productUnitId) || compatibleUnits[0];
        if (defaultUnit?.id) {
          form.setFieldValue(`details.${index}.unit_id`, Number(defaultUnit.id));
        }
      } catch (error) {
        console.error("Error loading product:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [productId]);

  const quantity = parseFloat(form.values.details[index]?.quantity || "0");
  const selectedUnitId = form.values.details[index]?.unit_id;
  const currentStock = productData?.current_stock || 0;
  const selectedUnit = availableUnits.find((u) => u.id === selectedUnitId);
  const baseUnit = productData?.unit;

  // Calcular cantidad en unidad base
  let quantityInBaseUnit = quantity;
  if (selectedUnit && baseUnit) {
    if (selectedUnit.base_unit_id !== null) {
      const factor = parseFloat(selectedUnit.factor_to_base || 1);
      quantityInBaseUnit = quantity * factor;
    }
  }

  const resultingStock = direction === "in" 
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
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

        {/* Selector de dirección (in/out) */}
        {!formContext.readonly && (
          <View style={{ marginBottom: 12, gap: 8 }}>
            <Text variant="labelSmall">Dirección</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip
                selected={direction === "out"}
                onPress={() => form.setFieldValue(`details.${index}.direction`, "out")}
                icon="arrow-down"
                mode={direction === "out" ? "flat" : "outlined"}
                style={{ flex: 1 }}
              >
                Salida (disminuye)
              </Chip>
              <Chip
                selected={direction === "in"}
                onPress={() => form.setFieldValue(`details.${index}.direction`, "in")}
                icon="arrow-up"
                mode={direction === "in" ? "flat" : "outlined"}
                style={{ flex: 1 }}
              >
                Entrada (aumenta)
              </Chip>
            </View>
          </View>
        )}

        {/* Producto */}
        <FormProSelect
          name={`details.${index}.product_id`}
          label="Producto"
          model="products"
          placeholder="Seleccione un producto"
          required
        />

        {/* Unidad */}
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

        {/* Cantidad con controles + / - */}

        <FormSelectSimple
          name={`details.${index}.reason_code`}
          label="Razón del producto"
          required
          data={[
            { label: "Pérdida", value: "loss" },
            { label: "Daño", value: "damage" },
            { label: "Diferencia de Conteo", value: "count_diff" },
            { label: "Vencimiento", value: "expiry" },
            { label: "Robo", value: "theft" },
            { label: "Encontrado", value: "found" },
            { label: "Otro", value: "other" },
          ]}
        />
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
                  form.setFieldValue(
                    `details.${index}.quantity`,
                    (currentQuantity - 1).toString()
                  );
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
                if (numValue >= 0) {
                  form.setFieldValue(`details.${index}.quantity`, value);
                }
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
                form.setFieldValue(
                  `details.${index}.quantity`,
                  (currentQuantity + 1).toString()
                );
              }}
            />
          )}
        </View>

        {/* Notas del detalle */}
        <FormInput
          name={`details.${index}.notes`}
          label="Notas"
          placeholder="Comentarios adicionales"
          multiline
          numberOfLines={2}
        />

        {!formContext.readonly && (
          <View style={{ marginTop: 8 }}>
            <AppUpload
              label="Evidencias del producto"
              placeholder="Subir imagenes para este producto"
              value={form.values.details[index]?.evidence || []}
              onChange={(files: UploadedFile[]) => form.setFieldValue(`details.${index}.evidence`, files)}
              multiple
              maxFiles={6}
              accept="images"
            />
          </View>
        )}

        {/* Información de stock */}
        {productData && !formContext.readonly && (
          <View
            style={{
              backgroundColor:
                resultingStock < 0 
                  ? palette.error + "15" 
                  : palette.primary + "10",
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              gap: 8,
              borderWidth: 1,
              borderColor: resultingStock < 0 ? palette.error + "30" : palette.primary + "30",
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Stock actual:
              </Text>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: "bold", color: palette.textSecondary }}
              >
                {currentStock} {baseUnit?.abbreviation || "unidades"}
              </Text>
            </View>

            <Divider style={{ marginVertical: 4 }} />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Stock resultante:
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <MaterialCommunityIcons
                  name={direction === "in" ? "arrow-up" : "arrow-down"}
                  size={16}
                  color={direction === "in" ? palette.primary : palette.error}
                />
                <Text
                  variant="bodyMedium"
                  style={{
                    fontWeight: "bold",
                    color: resultingStock < 0 ? palette.error : palette.primary,
                    fontSize: 16,
                  }}
                >
                  {resultingStock.toFixed(2)} {baseUnit?.abbreviation || "unidades"}
                </Text>
              </View>
            </View>

            {resultingStock < 0 && direction === "out" && (
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
                  El stock resultante será negativo
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Vista readonly */}
        {formContext.readonly && form.values.details[index]?.previous_stock !== undefined && (
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
            <Divider style={{ marginVertical: 4 }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Stock anterior:
              </Text>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: "bold", color: palette.textSecondary }}
              >
                {form.values.details[index].previous_stock}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
                Stock nuevo:
              </Text>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: "bold", color: palette.textSecondary }}
              >
                {form.values.details[index].new_stock}
              </Text>
            </View>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  productCard: {
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
  },
  emptyCard: {
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
});
