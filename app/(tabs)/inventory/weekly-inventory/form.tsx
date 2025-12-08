import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, {
  AppFormRef,
  useAppForm,
} from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useDebounce from "@/hooks/useDebounce";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Card, Divider, Text, TextInput } from "react-native-paper";
import * as Yup from "yup";

interface InventoryFormProps {
  id: number;
  readonly?: boolean;
}

interface ProductDetail {
  id?: number;
  inventory_count_id?: number;
  product_id: number;
  location_id?: number;
  system_quantity: number;
  counted_quantity?: number;
  difference?: number;
  notes?: string;
  // Datos del producto para mostrar
  product?: {
    id: number;
    name: string;
    code?: string;
    image?: string;
    unit?: {
      name: string;
      abbreviation: string;
    };
  };
}

interface InventoryFormData {
  id?: number;
  name: string;
  count_date: string;
  location_id?: number;
  status: "planning" | "counting" | "completed" | "cancelled";
  notes?: string;
  details: {
    [key: number]: App.Entities.InventoryCount.Detail;
  };
}

type Detail = {
  id?: number;
  product_id: number;
  location_id?: number;
  system_quantity: number;
  counted_quantity?: number;
  difference?: number;
  notes?: string;
};

export default function InventoryForm(props: InventoryFormProps) {
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<InventoryFormData>>(null);

  const router = useRouter();

  const alerts = useAlerts();

  const [products, setProducts] = useState<App.Entities.Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [productsRes, detailsRes] = await Promise.all([
        Services.products.index({
          location_id: selectedLocation?.id,
          with_stock: true,
        }),
        Services.inventoryCounts.show(props.id),
      ]);

      console.log("Fetched products:", productsRes.data.data);

      setProducts(productsRes.data.data as App.Entities.Product[]);

      const responses = {} as {
        [key: string]: Detail;
      };
      ((productsRes.data.data as App.Entities.Product[]) || []).forEach(
        (product) => {
          const existingResponse =
            detailsRes.data.data.details["product_" + product.id] || null;

          responses["product_" + product.id] = {
            id: existingResponse?.id || undefined,
            product_id: product.id,
            location_id: existingResponse?.location_id || selectedLocation?.id,
            system_quantity: existingResponse?.system_quantity || 0,
            counted_quantity: existingResponse?.counted_quantity || 0,
            difference: existingResponse?.difference || 0,
            notes: existingResponse?.notes || "",
          };
        }
      );

      formRef.current?.setValues({
        name: detailsRes.data.data.name || "",
        count_date: detailsRes.data.data.count_date || "",
        location_id: detailsRes.data.data.location?.id || selectedLocation?.id,
        status: detailsRes.data.data.status || "planning",
        notes: detailsRes.data.data.notes || "",
        details: (responses || {}) as any,
      } as any);
    } catch (error) {
      console.error("Error fetching initial values:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <AppForm
      loading={loading}
      readonly={props.readonly}
      id={props.id}
      ref={formRef}
      validationSchema={Yup.object().shape({
        name: Yup.string().required("El nombre del inventario es requerido"),
        count_date: Yup.date().required("La fecha es requerida"),
        notes: Yup.string(),
      })}
      submitButtonText="Completar conteo"
      showButtons={props.readonly ? false : true}
      showResetButton={false}
      onSubmit={async (values) => {
        // Validar que todos los productos tengan detalles en el FormData
        const missingProducts = products.filter((product) => {
          const detailId = values.get(`details[product_${product.id}][id]`);
          return !detailId;
        });

        if (missingProducts.length > 0) {
          const productNames = missingProducts.map((p) => p.name).join(", ");
          alerts.warning(
            `Debe completar el conteo de los siguientes productos: ${productNames}`
          );
          return values; // No continuar con el envío
        }

        const res = await alerts.confirm(
          "¿Estás seguro de completar el conteo?",
          {
            title: "Confirmar conteo",
          }
        );

        if (res) {
          // Values ya es FormData, solo agregar el campo status
          values.append("status", "completed");
          alerts.success("Conteo completado correctamente.");
          router.back();
          return Services.inventoryCounts.update(props.id, values);
        }

        alerts.success("Conteo completado correctamente.");
        router.back();

        return values;
      }}
      additionalSubmitButtons={<Button>Cancelar conteo</Button>}
    >
      <Card
        style={{
          backgroundColor: palette.primary + "15",
          marginBottom: 16,
          borderLeftWidth: 4,
          borderLeftColor: palette.primary,
        }}
      >
        <Card.Content>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <MaterialCommunityIcons
              name="information"
              size={24}
              color={palette.primary}
            />
            <View style={{ flex: 1 }}>
              <Text
                variant="titleSmall"
                style={{ fontWeight: "bold", color: palette.primary }}
              >
                Inventario Semanal
              </Text>
              <Text variant="bodySmall" style={{ color: palette.text }}>
                Verifica el stock físico y marca si coincide con el sistema
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <FormInput
        name="name"
        label="Nombre del Inventario"
        placeholder="Ej: Conteo Semanal Almacén Principal"
        multiline
        numberOfLines={3}
      />

      <FormDatePicker name="count_date" label="Fecha del Inventario" required />

      <FormInput
        name="notes"
        label="Comentarios"
        placeholder="Observaciones adicionales"
        multiline
        numberOfLines={3}
      />

      <Divider style={{ marginVertical: 16 }} />

      <ProductsList inventoryCountId={props.id} products={products} />
    </AppForm>
  );
}

interface ProductListProps {
  inventoryCountId: number;
  products: App.Entities.Product[];
}

function ProductsList({ inventoryCountId, products }: ProductListProps) {
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
          Productos ({products.length})
        </Text>
      </View>

      {products.length === 0 && (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={{ textAlign: "center", opacity: 0.6 }}>
              No hay productos con stock en esta ubicación
            </Text>
          </Card.Content>
        </Card>
      )}

      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          index={index}
          product={product}
          inventoryCountId={inventoryCountId}
        />
      ))}
    </>
  );
}

interface ProductCardProps {
  index: number;
  product: App.Entities.Product;
  inventoryCountId: number;
}

const fieldsToLabels = {
  counted_quantity: "Cantidad Contada",
  notes: "Notas",
};

function ProductCard({ index, product, inventoryCountId }: ProductCardProps) {
  const form = useFormikContext<InventoryFormData>();
  const formContext = useAppForm();
  const { selectedLocation } = useSelectedLocation();

  const [detail, setDetail] = useState<ProductDetail>({
    id: undefined,
    location_id: undefined,
    product_id: product.id,
    system_quantity: product.current_stock || 0,
    counted_quantity: 0,
    difference: 0,
    notes: "",
  });

  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
  const [countedQuantity, setCountedQuantity] = useState<number>(0);
  const alerts = useAlerts();

  useEffect(() => {
    const currentDetailMeta = form.getFieldProps(
      `details.product_${product.id}`
    );
    const currentDetail: ProductDetail | undefined =
      currentDetailMeta.value as any;

    if (currentDetail) {
      setDetail(currentDetail);
      // Si ya tiene un detalle, determinar si es correcto
      const countedQty = currentDetail.counted_quantity ?? 0;
      const systemQty = currentDetail.system_quantity ?? 0;

      if (countedQty === systemQty && currentDetail.id) {
        setIsCorrect(true);
      } else if (
        currentDetail.counted_quantity !== undefined &&
        currentDetail.counted_quantity !== 0 &&
        currentDetail.id
      ) {
        setIsCorrect(false);
        setCountedQuantity(currentDetail.counted_quantity);
      }
    } else {
      setIsCorrect(undefined);
    }
  }, []);

  const { run } = useDebounce(updateUpdateDetailField, { time: 300 });

  async function handleIsCorrectChange(value: boolean) {
    setIsCorrect(value);

    try {
      const newDetail: App.Entities.InventoryCount.Detail = {
        product_id: product.id,
        location_id: (detail.location_id || selectedLocation?.id) ?? 0,
        system_quantity: product.current_stock || 0,
        counted_quantity: value ? product.current_stock || 0 : 0,
        difference: 0,
        notes: value ? detail.notes || "" : "",
        inventory_count_id: inventoryCountId,
      };

      const res = await Services.inventoryCountsDetails.store(newDetail);

      if (res.data) {
        const updatedDetail: ProductDetail = {
          id: (res.data as any).id,
          product_id: product.id,
          location_id: newDetail.location_id,
          system_quantity: product.current_stock || 0,
          counted_quantity: newDetail.counted_quantity || 0,
          difference: 0,
          notes: newDetail.notes || "",
          inventory_count_id: inventoryCountId,
        };

        setDetail(updatedDetail);
        form.setFieldValue(`details.${product.id}`, updatedDetail);

        alerts.success("Detalle actualizado correctamente.");

        if (!value) {
          setCountedQuantity(0);
        }
      }
    } catch (error) {
      console.error("Error creating detail:", error);
    }
  }

  async function updateUpdateDetailField(field: string, value: any) {
    const data = {
      [field]: value,
      inventory_count_id: inventoryCountId,
      system_quantity: product.current_stock || 0,
      product_id: product.id,
      location_id: (detail.location_id || selectedLocation?.id) ?? 0,
    };

    try {
      const res = await Services.inventoryCountsDetails.store(data);
      if (res.data) {
        const finalDetail: ProductDetail = {
          id: (res.data as any).id,
          product_id: product.id,
          location_id: detail.location_id,
          system_quantity: product.current_stock || 0,
          counted_quantity:
            field === "counted_quantity" ? value : countedQuantity,
          difference:
            field === "counted_quantity"
              ? value - (product.current_stock || 0)
              : detail.difference,
          notes: field === "notes" ? value : detail.notes || "",
          inventory_count_id: inventoryCountId,
        };

        setDetail(finalDetail);
        form.setFieldValue(`details.${product.id}`, finalDetail);

        const label =
          fieldsToLabels[field as keyof typeof fieldsToLabels] || "Campo";
        alerts.success(`${label} actualizado correctamente.`);
      }
    } catch (error) {
      console.error("Error updating detail field:", error);
    }
  }

  const difference = countedQuantity - (product.current_stock || 0);
  const hasDiscrepancy = difference !== 0;

  return (
    <Card style={styles.productCard}>
      <Card.Content>
        {/* Header del producto */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
            gap: 12,
          }}
        >
          {/* Imagen del producto */}
          {product?.main_image && (
            <Image
              source={{ uri: product.main_image.uri || "" }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                backgroundColor: palette.background,
              }}
              resizeMode="cover"
            />
          )}

          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                variant="titleMedium"
                style={{ fontWeight: "bold", flex: 1 }}
              >
                {product?.name || "Producto"}
              </Text>
            </View>
            {product.code && (
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary, marginLeft: 28 }}
              >
                Código: {product.code}
              </Text>
            )}
          </View>
        </View>

        {/* Stock Information */}
        <View
          style={{
            backgroundColor: palette.background,
            padding: 12,
            borderRadius: 8,
            gap: 8,
            marginBottom: 12,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
              Stock en Sistema:
            </Text>
            <Text
              variant="bodyMedium"
              style={{ fontWeight: "bold", color: palette.primary }}
            >
              {product.current_stock || 0}{" "}
              {product.unit?.abbreviation || "unidades"}
            </Text>
          </View>
        </View>

        {/* Radio buttons - ¿El stock es correcto? */}
        {!formContext.readonly && (
          <View style={{ gap: 12 }}>
            <Text
              variant="titleSmall"
              style={{ fontWeight: "bold", marginBottom: 4 }}
            >
              ¿El stock es correcto?
            </Text>

            {/* Opción: Sí, está correcto */}
            <TouchableOpacity
              onPress={() => handleIsCorrectChange(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                backgroundColor:
                  isCorrect === true
                    ? palette.success + "15"
                    : palette.background,
                borderRadius: 8,
                borderWidth: 1,
                borderColor:
                  isCorrect === true ? palette.success : palette.border,
              }}
            >
              <MaterialCommunityIcons
                name={
                  isCorrect === true
                    ? "checkbox-marked-circle"
                    : "checkbox-blank-circle-outline"
                }
                size={24}
                color={
                  isCorrect === true ? palette.success : palette.textSecondary
                }
              />
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                Sí, el stock es correcto
              </Text>
            </TouchableOpacity>

            {/* Opción: No, ingresaré cantidad */}
            <TouchableOpacity
              onPress={() => handleIsCorrectChange(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 12,
                backgroundColor:
                  isCorrect === false
                    ? palette.error + "15"
                    : palette.background,
                borderRadius: 8,
                borderWidth: 1,
                borderColor:
                  isCorrect === false ? palette.error : palette.border,
              }}
            >
              <MaterialCommunityIcons
                name={
                  isCorrect === false
                    ? "checkbox-marked-circle"
                    : "checkbox-blank-circle-outline"
                }
                size={24}
                color={
                  isCorrect === false ? palette.error : palette.textSecondary
                }
              />
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                No, ingresaré la cantidad contada
              </Text>
            </TouchableOpacity>

            {/* Controles cuando NO está correcto */}
            {isCorrect === false && (
              <View style={{ gap: 12, marginTop: 8 }}>
                {/* Input con botones para cantidad */}
                <View>
                  <Text
                    variant="bodySmall"
                    style={{ marginBottom: 8, color: palette.textSecondary }}
                  >
                    Cantidad Contada
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      backgroundColor: palette.background,
                      borderRadius: 8,
                      padding: 8,
                      borderWidth: 1,
                      borderColor: palette.border,
                    }}
                  >
                    {/* Botón para disminuir */}
                    <TouchableOpacity
                      onPress={() => {
                        const newQty = Math.max(0, countedQuantity - 1);
                        setCountedQuantity(newQty);
                        run("counted_quantity", newQty);
                      }}
                      style={{
                        backgroundColor: palette.error,
                        borderRadius: 6,
                        padding: 8,
                        minWidth: 40,
                        alignItems: "center",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="minus"
                        size={20}
                        color="#fff"
                      />
                    </TouchableOpacity>

                    {/* Input de cantidad */}
                    <TextInput
                      mode="outlined"
                      value={countedQuantity.toString()}
                      onChangeText={(value) => {
                        const numValue = parseInt(value) || 0;
                        setCountedQuantity(numValue);
                        run("counted_quantity", numValue);
                      }}
                      keyboardType="numeric"
                      style={{
                        flex: 1,
                        backgroundColor: "#fff",
                        textAlign: "center",
                      }}
                      dense
                      right={
                        <TextInput.Affix
                          text={product.unit?.abbreviation || "unidades"}
                        />
                      }
                    />

                    {/* Botón para aumentar */}
                    <TouchableOpacity
                      onPress={() => {
                        const newQty = countedQuantity + 1;
                        setCountedQuantity(newQty);
                        run("counted_quantity", newQty);
                      }}
                      style={{
                        backgroundColor: palette.success,
                        borderRadius: 6,
                        padding: 8,
                        minWidth: 40,
                        alignItems: "center",
                      }}
                    >
                      <MaterialCommunityIcons
                        name="plus"
                        size={20}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Input de notas */}
                <View>
                  <Text
                    variant="bodySmall"
                    style={{ marginBottom: 8, color: palette.textSecondary }}
                  >
                    Notas (opcional)
                  </Text>
                  <FormInput
                    name={`details.product_${product.id}.notes`}
                    placeholder="Agregue observaciones si es necesario"
                    multiline
                    onChange={(text) => {
                      run("notes", text);
                    }}
                    numberOfLines={3}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Mostrar información en modo readonly */}
        {formContext.readonly && (
          <View
            style={{
              backgroundColor: hasDiscrepancy
                ? palette.error + "15"
                : palette.success + "15",
              padding: 12,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="bodyMedium">Cantidad Contada:</Text>
                <Text variant="bodyMedium" style={{ fontWeight: "bold" }}>
                  {countedQuantity} {product.unit?.abbreviation || "unidades"}
                </Text>
              </View>
              <View>
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary }}
                >
                  Notas:
                </Text>
                <FormInput
                  name={`details.product_${product.id}.notes`}
                  placeholder="Agregue observaciones si es necesario"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        )}

        {/* Mostrar diferencia si hay */}
        {isCorrect === false && hasDiscrepancy && (
          <View
            style={{
              backgroundColor:
                difference > 0 ? palette.primary + "15" : palette.error + "15",
              padding: 12,
              borderRadius: 8,
              marginTop: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <MaterialCommunityIcons
                name={difference > 0 ? "arrow-up-bold" : "arrow-down-bold"}
                size={20}
                color={difference > 0 ? palette.primary : palette.error}
              />
              <Text
                variant="bodyMedium"
                style={{
                  fontWeight: "bold",
                  color: difference > 0 ? palette.primary : palette.error,
                }}
              >
                {difference > 0 ? "Excedente" : "Faltante"}
              </Text>
            </View>
            <Text
              variant="bodyLarge"
              style={{
                fontWeight: "bold",
                color: difference > 0 ? palette.primary : palette.error,
              }}
            >
              {Math.abs(difference)} {product.unit?.abbreviation || "unidades"}
            </Text>
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
  emptyCard: {
    padding: 24,
    backgroundColor: "#f5f5f5",
  },
});
