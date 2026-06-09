import AppModal, { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import { FormProSelect, SelectDataProvider } from "@/components/Form/AppProSelect";
import { AlertsProvider, useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as Yup from "yup";

// supplier_id NO es nullable: el usuario debe seleccionar un proveedor
// para poder crear la compra. Sin esto, el form pasaba la validación
// desde el inicio y el backend recibia un supplier_id null.
const purchaseValidationSchema = Yup.object().shape({
  supplier_id: Yup.number()
    .typeError("El proveedor es requerido")
    .required("El proveedor es requerido"),
  document_number: Yup.string(),
  notes: Yup.string(),
  payment_method: Yup.string(),
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
  const alerts = useAlerts();
  const router = useRouter();
  const modalRef = useRef<AppModalRef>(null);
  const formRef = useRef<AppFormRef<any>>(null);

  // Memoizamos los initialValues para que la referencia sea estable.
  // El AppForm tiene un useEffect con props.initialValues como dep;
  // si pasamos un objeto literal nuevo en cada render, el useEffect
  // se dispara y resetea los valores que el usuario acaba de escribir.
  const initialValues = useMemo(
    () => ({
      supplier_id: null as number | null,
      document_number: "",
      notes: "",
      payment_method: "other",
      purchase_date: new Date().toISOString().split("T")[0],
    }),
    [],
  );

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

  const handleCreatePurchase = async (values: any) => {
    try {
      // El AppForm nos entrega los valores convertidos a FormData.
      // Lo normalizamos a un objeto plano para evitar enviar
      // multipart/form-data y que el backend reciba campos limpios.
      let obj: Record<string, any>;
      if (typeof FormData !== "undefined" && values instanceof FormData) {
        obj = {};
        const fd = values as unknown as {
          entries: () => IterableIterator<[string, unknown]>;
        };
        if (typeof fd.entries === "function") {
          for (const [key, val] of fd.entries()) {
            obj[key] = val;
          }
        }
      } else {
        obj = values as Record<string, any>;
      }

      // Coerceamos supplier_id a número (los selects devuelven string).
      const rawSupplier = obj.supplier_id;
      const supplierId =
        rawSupplier !== undefined && rawSupplier !== null && rawSupplier !== ""
          ? Number(rawSupplier)
          : undefined;

      const payload = {
        supplier_id: Number.isFinite(supplierId) ? supplierId : undefined,
        notes: obj.notes || undefined,
        payment_method: obj.payment_method || undefined,
      };

      const response = await Services.purchasesV2.upsertDraft(payload);

      const purchaseId =
        response?.data?.purchase_id ??
        response?.purchase_id ??
        response?.data?.data?.purchase_id ??
        null;

      modalRef.current?.hide();
      formRef.current?.resetForm();

      onSuccess?.(purchaseId);

      // Navegar a la vista de productos del POS
      router.push(`/(tabs)/home/purchases/formv2/productos` as any);
    } catch (error: any) {
      console.error("Error creating purchase:", error);

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Error al crear la compra";
      alerts.error(errorMessage);
    }
  };

  return (
    <AppModal ref={modalRef}>
      {/*
        El contenido del modal se renderiza dentro de un Portal de
        react-native-paper, lo que rompe la cadena de contextos del
        árbol raíz. Por eso los providers deben re-declararse aquí.
        (AppForm usa useAlerts para los errores, y FormProSelect usa
        useSelectData; ambos lanzarían error si no encuentran
        su provider correspondiente.)
      */}
      <AlertsProvider>
        <SelectDataProvider>
          <AppForm
            ref={formRef}
            validationSchema={purchaseValidationSchema}
            initialValues={initialValues}
            onSubmit={handleCreatePurchase}
            submitButtonText="Crear Compra"
            showResetButton={false}
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

            <FormSelectSimple
              name="payment_method"
              label="Método de pago"
              data={[
                { value: "cash", label: "Efectivo" },
                { value: "card", label: "Tarjeta" },
                { value: "transfer", label: "Transferencia" },
                { value: "other", label: "Otro" },
              ]}
            />

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
