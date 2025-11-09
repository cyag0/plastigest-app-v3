import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Card, DataTable, Divider, Text } from "react-native-paper";

interface Ingredient {
  id: number;
  name: string;
  code: string;
  quantity_needed: number;
  available_stock: number;
  unit: string;
}

interface ProductInfo {
  id: number;
  name: string;
  code: string;
  ingredients: Ingredient[];
}

interface ProductionFormData {
  id?: number;
  production_number?: string;
  production_date: string;
  location_id?: string;
  product_id?: number;
  quantity: number;
  comments?: string;
  company_id: number;
}

interface ProductionFormProps {
  id?: number;
  readonly?: boolean;
}

// Componente interno para mostrar ingredientes
function IngredientsList() {
  const { values, setFieldError, setFieldValue } =
    useFormikContext<ProductionFormData>();
  const { selectedLocation } = useSelectedLocation();
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxQuantity, setMaxQuantity] = useState<number | null>(null);
  const alerts = useAlerts();

  // Fetch product info when product_id changes
  useEffect(() => {
    if (!values.product_id || !selectedLocation?.id) {
      setProductInfo(null);
      setMaxQuantity(null);
      return;
    }

    const fetchProductInfo = async () => {
      try {
        setLoading(true);
        if (!values.product_id) return;

        const response = await Services.products.show(values.product_id);
        const product = response.data.data;

        // Obtener ingredientes con stock disponible
        if (product.ingredients && product.ingredients.length > 0) {
          const ingredientsWithStock = await Promise.all(
            product.ingredients.map(async (ingredientData: any) => {
              try {
                // El resource retorna ingredient_id, no id del ingrediente
                const ingredientId = ingredientData.ingredient_id;

                // Obtener información completa del ingrediente incluyendo stock
                const ingredientResponse = await Services.products.show(
                  ingredientId
                );
                const ingredient = ingredientResponse.data.data;

                const availableStock = ingredient.current_stock || 0;
                const quantityNeeded = ingredientData.quantity || 1;

                return {
                  id: ingredientId,
                  name: ingredientData.ingredient_name || ingredient.name,
                  code: ingredientData.ingredient_code || ingredient.code,
                  quantity_needed: quantityNeeded,
                  available_stock: availableStock,
                  unit: (ingredient as any).unit || "unidad",
                };
              } catch (error) {
                console.error(
                  `Error fetching stock for ingredient ${ingredientData.ingredient_id}:`,
                  error
                );
                return {
                  id: ingredientData.ingredient_id,
                  name: ingredientData.ingredient_name || "Desconocido",
                  code: ingredientData.ingredient_code || "",
                  quantity_needed: ingredientData.quantity || 1,
                  available_stock: 0,
                  unit: "unidad",
                };
              }
            })
          );

          // Calcular cantidad máxima que se puede producir
          const maxProducible = Math.min(
            ...ingredientsWithStock.map((ing) =>
              Math.floor(ing.available_stock / ing.quantity_needed)
            )
          );

          setProductInfo({
            id: product.id,
            name: product.name,
            code: product.code || "",
            ingredients: ingredientsWithStock,
          });

          setMaxQuantity(maxProducible);

          // Validar cantidad actual y mostrar alerta
          if (values.quantity > maxProducible) {
            setFieldError(
              "quantity",
              `La cantidad máxima que puedes producir es ${maxProducible}`
            );
            setFieldValue("quantity", maxProducible);

            if (maxProducible === 0) {
              alerts.warning(
                "No hay stock suficiente de los ingredientes para producir este producto"
              );
            } else {
              alerts.warning(
                `Se ha ajustado la cantidad. Máximo producible: ${maxProducible} unidades`
              );
            }
          }
        } else {
          setProductInfo(null);
          setMaxQuantity(null);
        }
      } catch (error) {
        console.error("Error fetching product info:", error);
        setProductInfo(null);
        setMaxQuantity(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProductInfo();
  }, [values.product_id, selectedLocation?.id]);

  // Validar cantidad cuando cambia
  useEffect(() => {
    if (maxQuantity !== null && values.quantity > maxQuantity) {
      setFieldError(
        "quantity",
        `La cantidad máxima que puedes producir es ${maxQuantity}`
      );

      setFieldValue("quantity", maxQuantity);
    }
  }, [values.quantity, maxQuantity]);

  if (!values.product_id) {
    return null;
  }

  if (loading) {
    return (
      <Card style={{ marginBottom: 16, backgroundColor: palette.surface }}>
        <Card.Content>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <ActivityIndicator size="small" color={palette.primary} />
            <Text style={{ marginLeft: 8, color: palette.text }}>
              Cargando información de ingredientes...
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (!productInfo || productInfo.ingredients.length === 0) {
    return (
      <Card style={{ marginBottom: 16, backgroundColor: palette.warning }}>
        <Card.Content>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={20}
              color={palette.error}
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: palette.error, flex: 1 }}>
              Este producto no tiene ingredientes configurados
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const hasInsufficientStock = productInfo.ingredients.some(
    (ing) => ing.available_stock < ing.quantity_needed * values.quantity
  );

  return (
    <View style={{ marginBottom: 16 }}>
      <Card style={{ backgroundColor: palette.card }}>
        <Card.Content>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={24}
              color={palette.primary}
              style={{ marginRight: 8 }}
            />
            <Text
              variant="titleMedium"
              style={{ fontWeight: "bold", color: palette.text }}
            >
              Ingredientes Necesarios
            </Text>
          </View>

          {maxQuantity !== null && (
            <View
              style={{
                backgroundColor:
                  maxQuantity > 0 ? palette.success : palette.warning,
                padding: 12,
                borderRadius: 4,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <MaterialCommunityIcons
                name={maxQuantity > 0 ? "check-circle" : "alert"}
                size={20}
                color={maxQuantity > 0 ? palette.background : palette.error}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontWeight: "bold",
                  color: maxQuantity > 0 ? palette.background : palette.error,
                  flex: 1,
                }}
              >
                {maxQuantity > 0
                  ? `Puedes producir hasta ${maxQuantity} unidades`
                  : "No hay suficiente stock para producir"}
              </Text>
            </View>
          )}

          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Ingrediente</DataTable.Title>
              <DataTable.Title numeric>Por Unidad</DataTable.Title>
              <DataTable.Title numeric>Total</DataTable.Title>
              <DataTable.Title numeric>Disponible</DataTable.Title>
            </DataTable.Header>

            {productInfo.ingredients.map((ingredient) => {
              const totalNeeded = ingredient.quantity_needed * values.quantity;
              const isInsufficient = ingredient.available_stock < totalNeeded;

              return (
                <DataTable.Row
                  key={ingredient.id}
                  style={
                    isInsufficient ? { backgroundColor: palette.warning } : {}
                  }
                >
                  <DataTable.Cell>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {isInsufficient && (
                        <MaterialCommunityIcons
                          name="alert"
                          size={16}
                          color={palette.error}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text style={{ color: palette.text }}>
                        {ingredient.name}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={{ color: palette.text }}>
                      {ingredient.quantity_needed}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text
                      style={
                        isInsufficient
                          ? { color: palette.error, fontWeight: "bold" }
                          : { color: palette.text }
                      }
                    >
                      {totalNeeded}
                    </Text>
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Text style={{ color: palette.text }}>
                      {ingredient.available_stock}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>

          {hasInsufficientStock && (
            <View
              style={{
                backgroundColor: palette.warning,
                padding: 12,
                borderRadius: 4,
                marginTop: 12,
                borderLeftWidth: 4,
                borderLeftColor: palette.error,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={20}
                  color={palette.error}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ color: palette.error, fontWeight: "bold", flex: 1 }}
                >
                  Stock insuficiente para algunos ingredientes
                </Text>
              </View>
              <Text
                style={{ color: palette.error, fontSize: 12, marginTop: 4 }}
              >
                Reduce la cantidad a producir o asegúrate de tener suficiente
                inventario
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

export default function ProductionForm(props: ProductionFormProps) {
  const params = useLocalSearchParams();
  const productionId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const formRef = useRef<AppFormRef<ProductionFormData>>(null);

  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const alerts = useAlerts();

  // Handler para validar antes de enviar
  const handleSubmit = async (values: ProductionFormData) => {
    // Obtener información del producto para validar stock
    try {
      const product = await Services.products.show(values.product_id!);

      const productData = product.data as any;

      if (!productData.ingredients || productData.ingredients.length === 0) {
        alerts.error("Este producto no tiene ingredientes configurados");
        throw new Error("Sin ingredientes configurados");
      }

      // Verificar disponibilidad de ingredientes
      const ingredientsWithStock = await Promise.all(
        productData.ingredients.map(async (ing: any) => {
          try {
            const ingredientData = await Services.products.show(
              ing.ingredient_id
            );
            const ingData = ingredientData.data as any;
            return {
              name: ingData.name,
              needed: ing.quantity * values.quantity,
              available: ingData.current_stock || 0,
            };
          } catch {
            return {
              name: ing.ingredient_name || "Desconocido",
              needed: ing.quantity * values.quantity,
              available: 0,
            };
          }
        })
      );

      const hasInsufficient = ingredientsWithStock.some(
        (ing: any) => ing.available < ing.needed
      );

      if (hasInsufficient) {
        const confirmed = await alerts.confirm(
          "Algunos ingredientes no tienen stock suficiente. ¿Deseas continuar de todas formas?",
          {
            title: "Stock insuficiente",
            okText: "Sí, continuar",
            cancelText: "Cancelar",
          }
        );

        if (!confirmed) {
          throw new Error("Cancelado por el usuario");
        }
      } else {
        // Confirmar producción normal
        const confirmed = await alerts.confirm(
          `¿Confirmas el registro de ${values.quantity} unidades? Se restarán los ingredientes del inventario.`,
          {
            title: "Confirmar producción",
            okText: "Confirmar",
            cancelText: "Cancelar",
          }
        );

        if (!confirmed) {
          throw new Error("Cancelado por el usuario");
        }
      }
    } catch (error: any) {
      if (error.message === "Cancelado por el usuario") {
        throw error;
      }
      alerts.error("Error al validar la producción: " + error.message);
      throw error;
    }
  };

  return (
    <AppForm
      ref={formRef}
      api={Services.productions}
      id={productionId}
      readonly={props.readonly}
      style={{ backgroundColor: palette.background }}
      submitButtonText="Registrar Producción"
      onSubmit={handleSubmit}
      initialValues={{
        company_id: company?.id || 0,
        location_id: selectedLocation?.id?.toString() || "",
        production_date: new Date().toISOString().split("T")[0],
        quantity: 1,
      }}
    >
      {/* Información General */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <MaterialCommunityIcons
          name="information"
          size={24}
          color={palette.primary}
          style={{ marginRight: 8 }}
        />
        <Text
          variant="titleMedium"
          style={{ fontWeight: "bold", color: palette.text }}
        >
          Información de Producción
        </Text>
      </View>

      <Card style={{ marginBottom: 16, backgroundColor: palette.card }}>
        <Card.Content>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <MaterialCommunityIcons
              name="factory"
              size={20}
              color={palette.primary}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text
              variant="bodyMedium"
              style={{ color: palette.textSecondary, flex: 1 }}
            >
              Selecciona un producto procesado y la cantidad producida. El
              sistema automáticamente restará los ingredientes del inventario.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <FormProSelect
        name="company_id"
        label="Compañía"
        model="admin.companies"
        placeholder="Seleccionar compañía"
        disabled
      />

      <FormProSelect
        name="location_id"
        label="Ubicación"
        model="admin.locations"
        placeholder="Seleccionar ubicación"
        disabled
      />

      <FormDatePicker
        name="production_date"
        label="Fecha de Producción"
        placeholder="YYYY-MM-DD"
        required
      />

      <Divider
        style={{ marginVertical: 24, backgroundColor: palette.border }}
      />

      {/* Producto y Cantidad */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <MaterialCommunityIcons
          name="package-variant-closed"
          size={24}
          color={palette.primary}
          style={{ marginRight: 8 }}
        />
        <Text
          variant="titleMedium"
          style={{ fontWeight: "bold", color: palette.text }}
        >
          Producto a Producir
        </Text>
      </View>

      <FormProSelect
        name="product_id"
        label="Producto Procesado"
        model="products"
        fetchParams={{
          product_type: ["processed"],
        }}
        placeholder="Seleccionar producto procesado"
        required
      />

      {/* Mostrar ingredientes y validaciones */}
      <IngredientsList />

      <FormInput
        name="quantity"
        label="Cantidad producida"
        placeholder="Ingrese la cantidad"
        keyboardType="numeric"
        required
      />

      <FormInput
        name="comments"
        label="Comentarios"
        placeholder="Notas adicionales sobre la producción"
        multiline
        numberOfLines={4}
      />

      <Divider
        style={{ marginVertical: 24, backgroundColor: palette.border }}
      />

      {/* Información de Ingredientes */}
      <Card style={{ backgroundColor: palette.info, marginBottom: 16 }}>
        <Card.Content>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={24}
              color={palette.error}
              style={{ marginRight: 8 }}
            />
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "bold",
                color: palette.error,
              }}
            >
              Importante
            </Text>
          </View>
          <View style={{ paddingLeft: 32 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <MaterialCommunityIcons
                name="minus"
                size={16}
                color={palette.textSecondary}
                style={{ marginRight: 4, marginTop: 2 }}
              />
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary, flex: 1 }}
              >
                Al registrar la producción, se restarán automáticamente los
                ingredientes necesarios del inventario.
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 4,
              }}
            >
              <MaterialCommunityIcons
                name="plus"
                size={16}
                color={palette.textSecondary}
                style={{ marginRight: 4, marginTop: 2 }}
              />
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary, flex: 1 }}
              >
                Se agregará el producto terminado al inventario.
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <MaterialCommunityIcons
                name="check"
                size={16}
                color={palette.textSecondary}
                style={{ marginRight: 4, marginTop: 2 }}
              />
              <Text
                variant="bodyMedium"
                style={{ color: palette.textSecondary, flex: 1 }}
              >
                Asegúrate de tener suficiente stock de los ingredientes.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </AppForm>
  );
}
