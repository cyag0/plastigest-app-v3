import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, {
  AppFormRef,
  useAppForm,
} from "@/components/Form/AppForm/AppForm";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import PurchaseStepper from "@/components/Views/PurchaseStepper";
import TicketView from "@/components/Views/TicketView";
import { useAlerts } from "@/hooks/useAlerts";
import { usePurchaseValidation } from "@/hooks/usePurchaseValidation";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import axios from "@/utils/axios";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Modal, ScrollView, View } from "react-native";
import { Button, Divider, Text } from "react-native-paper";
import SalesForm from "../sales/POS";

interface PurchaseFormData {
  id?: number;
  purchase_number: string;
  purchase_date: string;
  location_origin_id?: string;
  supplier_id?: number;
  status: string;
  comments?: string;
  company_id: number;
  // Productos seleccionados para la compra
  purchase_items?: {
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

interface PurchasesFormProps {
  id?: number;
  readonly?: boolean;
}

// Componente interno que tiene acceso al contexto Formik
function PurchaseFormContent(
  props: PurchasesFormProps & {
    supplierId?: number;
    setSupplierId: (id: number | undefined) => void;
    onStatusChange?: (status: string) => void;
  }
) {
  const { values } = useFormikContext<PurchaseFormData>();
  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

  // Usar hook de validación
  const { canEdit, statusInfo } = usePurchaseValidation({
    status: values.status,
    readonly: props.readonly,
  });

  // Monitorear cambios en supplier_id del formulario
  useEffect(() => {
    if (
      values.supplier_id &&
      parseInt(values.supplier_id.toString()) !== props.supplierId
    ) {
      props.setSupplierId(parseInt(values.supplier_id.toString()));
    }
  }, [values.supplier_id]);

  return (
    <>
      {/* Panel Izquierdo - Formulario */}
      <ScrollView
        style={{
          flex: isMobile ? 1 : 2,
          backgroundColor: "white",
          borderRadius: 8,
          margin: 16,
        }}
      >
        <View style={{ padding: 16 }}>
          {/* Stepper de Estado */}
          {props.id && (
            <PurchaseStepper
              currentStatus={values.status}
              onStatusChange={props.onStatusChange}
              readonly={false}
            />
          )}

          {/* Mensaje informativo sobre edición */}
          {!canEdit && values.status !== "draft" && (
            <View
              style={{
                backgroundColor: "#fff3e0",
                padding: 12,
                borderRadius: 6,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: "#ff9800",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: "#e65100",
                  textAlign: "center",
                }}
              >
                {statusInfo.message}
              </Text>
            </View>
          )}

          {/* Información General */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información General
          </Text>

          <FormProSelect
            name="company_id"
            label="Compañía"
            model="admin.companies"
            placeholder="Seleccionar compañía"
            disabled
          />

          <FormProSelect
            name="location_origin_id"
            label="Ubicación"
            model="admin.locations"
            placeholder="Seleccionar ubicación"
            disabled
          />

          <FormDatePicker
            name="purchase_date"
            label="Fecha de Compra"
            placeholder="YYYY-MM-DD"
            required
          />

          <FormProSelect
            name="supplier_id"
            label="Proveedor"
            model="suppliers"
            placeholder="Seleccionar proveedor"
            disabled={!canEdit}
          />

          {/* <FormInput
            name="comments"
            label="Comentarios Generales"
            placeholder="Comentarios adicionales sobre la compra"
            multiline
            numberOfLines={4}
            readOnly={!canEdit}
          /> */}

          <Divider style={{ marginVertical: 24 }} />

          {/* Sección de Productos */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Productos para Comprar
          </Text>

          {/* Modal POS */}
          <ModalPurchase />
        </View>
      </ScrollView>
    </>
  );
}

export default function PurchasesForm(props: PurchasesFormProps) {
  const params = useLocalSearchParams();
  const purchaseId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!purchaseId;
  const formRef = useRef<AppFormRef<PurchaseFormData>>(null);

  const { company } = useSelectedCompany();
  const { selectedLocation } = useSelectedLocation();
  const alerts = useAlerts();

  const [supplierId, setSupplierId] = useState<number>();

  // Función para manejar cambios de estado
  const handleStatusChange = async (newStatus: string) => {
    try {
      if (!purchaseId) return;

      // Confirmar cambio de estado
      const confirmed = await alerts.confirm(
        `¿Confirmas el cambio de estado de la compra?`,
        {
          title: "Cambiar estado",
          okText: "Confirmar",
          cancelText: "Cancelar",
        }
      );

      if (!confirmed) {
        return;
      }

      const response = await axios.post(
        `/auth/admin/purchases/${purchaseId}/transition`,
        {
          status: newStatus,
        }
      );

      if (response.data.success) {
        // Recargar el formulario para mostrar el nuevo estado
        formRef.current?.reload();

        // Mostrar mensaje de éxito
        alerts.success(`Estado actualizado a: ${response.data.message}`);
      }
    } catch (error: any) {
      console.error("Error changing status:", error);

      // Mostrar mensaje de error específico
      const errorMessage =
        error.response?.data?.message || "Error al cambiar el estado";

      alerts.error(`Error: ${errorMessage}`);
    }
  };

  return (
    <AppForm
      ref={formRef}
      api={Services.purchases}
      id={purchaseId}
      readonly={props.readonly}
      disableScroll
      style={{ backgroundColor: "#f5f5f5", padding: 0 }}
      containerStyle={{
        flexDirection: "row",
        gap: 16,
        height: "100%",
      }}
      showResetButton={false}
      submitButtonText="Guardar Borrador"
      additionalSubmitButtons={
        <>
          <View>
            <Button onPress={() => formRef.current?.submitForm()}>
              Compra en Camino
            </Button>
          </View>
        </>
      }
      initialValues={{
        company_id: company?.id.toString() || "",
        status: "draft",
        location_origin_id: selectedLocation?.id?.toString(),
        purchase_date: new Date().toISOString().split("T")[0],
      }}
    >
      <PurchaseFormContent
        {...props}
        id={purchaseId}
        supplierId={supplierId}
        setSupplierId={setSupplierId}
        onStatusChange={handleStatusChange}
      />
    </AppForm>
  );
}

function ModalPurchase() {
  // Estado del carrito de compras
  const form = useFormikContext<PurchaseFormData>();

  const cart = form.values.purchase_items || [];
  const [showPOSModal, setShowPOSModal] = useState(false);
  const appForm = useAppForm();

  // Función para abrir el POS de compras
  const openPurchasesPOS = () => {
    setShowPOSModal(true);
  };

  // Función para manejar la confirmación del POS
  const handlePOSConfirm = (newCart: any[], total: number) => {
    console.log("POS confirmed, newCart:", newCart, "total:", total);

    form.setFieldValue("purchase_items", newCart);
    setShowPOSModal(false);
  };

  // Función para cerrar el POS sin cambios
  const handlePOSClose = () => {
    setShowPOSModal(false);
  };

  const screenWidth = Dimensions.get("window").width;
  const isMobile = screenWidth < 768;

  const readonly = appForm.readonly;

  return (
    <>
      <AppDependency name="supplier_id">
        {(value) => {
          if (!value) {
            return <Text>Selecciona un proveedor para agregar productos</Text>;
          }

          return (
            <>
              {!readonly && (
                <Button onPress={openPurchasesPOS}>Abrir POS de Compras</Button>
              )}
              <View
                style={{
                  flex: 1,
                }}
              >
                <TicketView
                  cart={cart as any}
                  cartTotal={100}
                  cartItemsCount={cart.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}
                  readonly={true}
                  type="purchases"
                />
              </View>
              <Modal
                visible={showPOSModal}
                animationType="slide"
                presentationStyle="formSheet"
                /* onRequestClose={handlePOSClose} */
              >
                <SalesForm
                  type="purchases"
                  onConfirm={handlePOSConfirm}
                  onClose={handlePOSClose}
                  initialCart={cart}
                  supplier_id={value}
                />
              </Modal>
            </>
          );
        }}
      </AppDependency>
    </>
  );
}
