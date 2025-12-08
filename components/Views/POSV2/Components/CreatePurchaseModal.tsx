import AppModal, { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import {
  FormProSelect,
  SelectDataProvider,
} from "@/components/Form/AppProSelect";
import { AlertsProvider, useAlerts } from "@/hooks/useAlerts";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import * as Yup from "yup";

const purchaseValidationSchema = Yup.object().shape({
  supplier_id: Yup.number().nullable().required("El proveedor es requerido"),
  document_number: Yup.string(),
  notes: Yup.string(),
});

export interface CreatePurchaseModalRef {
  show: () => void;
  hide: () => void;
}

interface CreatePurchaseModalProps {
  onSuccess?: (purchaseId: number) => void;
}

const CreatePurchaseModal = forwardRef<
  CreatePurchaseModalRef,
  CreatePurchaseModalProps
>(({ onSuccess }, ref) => {
  const { selectedLocation } = useSelectedLocation();
  const alerts = useAlerts();
  const router = useRouter();
  const modalRef = useRef<AppModalRef>(null);
  const formRef = useRef<AppFormRef<any>>(null);

  useImperativeHandle(ref, () => ({
    show: () => {
      modalRef.current?.show({
        title: "Nueva Compra",
        dismissable: true,
        width: "90%",
      });
    },
    hide: () => {
      modalRef.current?.hide();
    },
  }));

  const handleCreatePurchase = async (values: FormData) => {
    try {
      values.append("status", "draft");

      const response = await Services.purchases.store(values);

      const purchase = response.data?.data || response.data;

      modalRef.current?.hide();
      formRef.current?.resetForm();

      onSuccess?.(purchase.id);

      // Navegar a la vista de productos del POS
      router.push(`/(tabs)/home/purchases/formv2?id=${purchase.id}` as any);
    } catch (error: any) {
      console.error("Error creating purchase:", error);
      throw error;
    }
  };

  return (
    <AppModal ref={modalRef}>
      <AlertsProvider>
        <SelectDataProvider>
          <AppForm
            ref={formRef}
            validationSchema={purchaseValidationSchema}
            initialValues={{
              supplier_id: null,
              document_number: "",
              notes: "",
            }}
            onSubmit={handleCreatePurchase}
          >
            <FormProSelect
              name="supplier_id"
              label="Proveedor"
              placeholder="Selecciona un proveedor"
              required
              model="suppliers"
            />

            <FormDatePicker
              name="purchase_date"
              label="Fecha de Compra"
              required
            />

            {/*             <FormInput
              name="document_number"
              label="Número de Documento (Opcional)"
              placeholder="Ej: F001-00123"
            /> */}

            <FormInput
              name="notes"
              label="Notas (Opcional)"
              placeholder="Observaciones generales de la compra"
              multiline
              numberOfLines={4}
            />
          </AppForm>
        </SelectDataProvider>
      </AlertsProvider>
    </AppModal>
  );
});

CreatePurchaseModal.displayName = "CreatePurchaseModal";

export default CreatePurchaseModal;
