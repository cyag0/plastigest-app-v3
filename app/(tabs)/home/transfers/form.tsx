import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormNumeric } from "@/components/Form/AppNumeric";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import palette from "@/constants/palette";
import { useAlerts } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useRef } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Button, Card, Divider, IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface ProductDetail {
  product_id: number;
  product_name?: string;
  quantity_requested: string;
  unit_cost: string;
  notes?: string;
}

interface TransferFormData {
  from_location_id: number;
  to_location_id: number;
  company_id: number;
  requested_at: string;
  notes?: string;
  details: ProductDetail[];
}

// Componente interno para manejar la lógica de productos
function ProductsSection() {
  const { values, setFieldValue } = useFormikContext<TransferFormData>();
  const details = values.details || []; // Asegurar que details nunca sea undefined

  const handleAddProduct = () => {
    const newProduct: ProductDetail = {
      product_id: 0,
      quantity_requested: "1",
      unit_cost: "0",
      notes: "",
    };
    setFieldValue("details", [...details, newProduct]);
  };

  const handleRemoveProduct = (index: number) => {
    const updatedDetails = details.filter((_, i) => i !== index);
    setFieldValue("details", updatedDetails);
  };

  const handleProductChange = (index: number, product: any) => {
    if (product) {
      setFieldValue(`details.${index}.product_id`, product.id);
      setFieldValue(`details.${index}.product_name`, product.name);
      setFieldValue(`details.${index}.unit_cost`, product.purchase_price || "0");
    }
  };

  // Filtrar productos ya seleccionados (simplificado)
  const isProductSelected = (productId: number, currentIndex: number) => {
    return details.some((detail, index) => 
      index !== currentIndex && detail.product_id === productId
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Productos a Transferir
          </Text>
          <Button
            mode="contained"
            onPress={handleAddProduct}
            icon={() => <MaterialCommunityIcons name="plus" size={18} color="white" />}
            compact
            style={styles.addButton}
          >
            Agregar
          </Button>
        </View>

        {details.length === 0 && (
          <Text style={styles.emptyText}>
            Agrega productos para incluir en la transferencia
          </Text>
        )}

        {details.map((detail, index) => (
          <Card key={index} style={styles.productCard}>
            <Card.Content>
              <View style={styles.productHeader}>
                <Text variant="titleSmall">Producto #{index + 1}</Text>
                <IconButton
                  icon="close"
                  size={20}
                  iconColor={palette.error}
                  onPress={() => handleRemoveProduct(index)}
                />
              </View>

              <FormProSelect
                name={`details.${index}.product_id`}
                label="Producto"
                model="products"
                labelField="name"
                placeholder="Selecciona un producto"
                required
              />

              {isProductSelected(detail.product_id, index) && (
                <Text style={styles.errorText}>
                  ⚠️ Este producto ya está seleccionado
                </Text>
              )}

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <FormNumeric
                    name={`details.${index}.quantity_requested`}
                    label="Cantidad Solicitada"
                    placeholder="1"
                    required
                  />
                </View>
                <View style={styles.halfWidth}>
                  <FormNumeric
                    name={`details.${index}.unit_cost`}
                    label="Costo Unitario"
                    placeholder="0.00"
                    required
                  />
                </View>
              </View>

              <FormInput
                name={`details.${index}.notes`}
                label="Notas (opcional)"
                placeholder="Notas sobre este producto..."
                multiline
                numberOfLines={2}
              />
            </Card.Content>
          </Card>
        ))}
      </Card.Content>
    </Card>
  );
}

export default function TransferForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const alerts = useAlerts();
  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const formRef = useRef<AppFormRef<TransferFormData>>(null);

  const transferId = params.id ? parseInt(params.id as string) : undefined;
  const isEditing = !!transferId;

  // Función para filtrar ubicaciones de destino
  const getDestinationLocationFilter = (fromLocationId: number) => {
    return fromLocationId > 0 ? { exclude_ids: [fromLocationId] } : {};
  };

  return (
    <View style={styles.container}>
      <AppForm
        ref={formRef}
        api={Services.transfers}
        id={transferId}
        initialValues={{
          from_location_id: selectedLocation?.id || 0,
          to_location_id: 0,
          company_id: company?.id || 0,
          requested_at: new Date().toISOString().split("T")[0],
          notes: "",
          details: [],
        }}
        validationSchema={Yup.object().shape({
          from_location_id: Yup.number()
            .min(1, "La ubicación de origen es obligatoria")
            .required("La ubicación de origen es obligatoria"),
          to_location_id: Yup.number()
            .min(1, "La ubicación de destino es obligatoria")
            .required("La ubicación de destino es obligatoria")
            .notOneOf([Yup.ref("from_location_id")], "La ubicación de destino debe ser diferente a la de origen"),
          requested_at: Yup.string().required("La fecha es obligatoria"),
          details: Yup.array()
            .of(
              Yup.object().shape({
                product_id: Yup.number()
                  .min(1, "Selecciona un producto")
                  .required("El producto es obligatorio"),
                quantity_requested: Yup.number()
                  .min(0.01, "La cantidad debe ser al menos 0.01")
                  .required("La cantidad es obligatoria"),
                unit_cost: Yup.number()
                  .min(0, "El costo unitario no puede ser negativo")
                  .required("El costo unitario es obligatorio"),
              })
            )
            .min(1, "Debe agregar al menos un producto a la transferencia"),
        })}
        showSubmitButton={true}
        submitButtonText="Crear Transferencia"
        onSuccess={() => {
          alerts.success("Transferencia creada correctamente");
          router.back();
        }}
        onError={(error) => {
          alerts.error("Error al crear la transferencia: " + (error.message || "Error desconocido"));
        }}
      >
        <ScrollView style={styles.formContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                📍 Ubicaciones
              </Text>
              
              <LocationSelector />
              
              <Divider style={styles.divider} />
              
              <Text variant="titleMedium" style={styles.sectionTitle}>
                📅 Información General
              </Text>

              <FormDatePicker
                name="requested_at"
                label="Fecha de Solicitud"
                placeholder="Selecciona la fecha"
                required
              />

              <FormInput
                name="notes"
                label="Notas"
                placeholder="Notas adicionales sobre la transferencia (opcional)"
                multiline
                numberOfLines={3}
              />
            </Card.Content>
          </Card>

          <ProductsSection />
        </ScrollView>
      </AppForm>
    </View>
  );
}

// Componente para manejar la selección de ubicaciones
function LocationSelector() {
  const { values, setFieldValue } = useFormikContext<TransferFormData>();
  
  return (
    <>
      <FormProSelect
        name="from_location_id"
        label="Ubicación de Origen"
        model="admin.locations"
        placeholder="Selecciona la ubicación de origen"
        required
      />

      <FormProSelect
        name="to_location_id"
        label="Ubicación de Destino"
        model="admin.locations"
        placeholder="Selecciona la ubicación de destino"
        disabled={!values.from_location_id}
        required
      />
      
      {values.from_location_id === values.to_location_id && values.to_location_id > 0 && (
        <Text style={styles.errorText}>
          ⚠️ La ubicación de destino debe ser diferente a la de origen
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  formContent: {
    padding: 16,
  },
  card: {
    marginVertical: 8,
    elevation: 2,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    color: palette.primary,
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: "#e9ecef",
  },
  addButton: {
    backgroundColor: palette.primary,
    borderRadius: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#6c757d",
    fontStyle: "italic",
    paddingVertical: 20,
    fontSize: 14,
  },
  productCard: {
    marginBottom: 12,
    backgroundColor: "#f8f9fa",
    elevation: 1,
    borderRadius: 8,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  errorText: {
    color: palette.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
});