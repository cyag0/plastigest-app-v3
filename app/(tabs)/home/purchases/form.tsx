import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import { Divider, Text } from "react-native-paper";

interface PurchaseFormData {
  purchase_number: string;
  purchase_date: string;
  location_id?: string;
  supplier_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_address?: string;
  status: string;
  comments?: string;
  company_id: number;
}

interface PurchasesFormProps {
  id?: number;
  readonly?: boolean;
}

export default function PurchasesForm(props: PurchasesFormProps) {
  const params = useLocalSearchParams();
  const purchaseId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!purchaseId;
  const formRef = useRef<AppFormRef<PurchaseFormData>>(null);

  const { company } = useSelectedCompany();

  return (
    <AppForm
      ref={formRef}
      api={Services.purchases}
      id={purchaseId}
      readonly={props.readonly}
      initialValues={{
        company_id: [company?.id.toString() || ""],
        status: "open",
        purchase_date: new Date().toISOString().split("T")[0],
      }}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Información General */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información General
          </Text>

          <FormInput
            name="purchase_number"
            label="Número de Compra"
            placeholder="Ej: PUR-2024-001"
            required
          />

          <FormInput
            name="purchase_date"
            label="Fecha de Compra"
            placeholder="YYYY-MM-DD"
            required
          />

          <FormProSelect
            name="location_id"
            label="Ubicación"
            model="admin.locations"
            placeholder="Seleccionar ubicación"
          />

          <FormInput
            name="status"
            label="Estado (open/closed)"
            placeholder="open"
          />

          <Divider style={{ marginVertical: 20 }} />

          {/* Información del Proveedor */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información del Proveedor
          </Text>

          <FormInput
            name="supplier_name"
            label="Nombre del Proveedor"
            placeholder="Nombre de la empresa o persona"
          />

          <FormInput
            name="supplier_email"
            label="Email del Proveedor"
            placeholder="email@proveedor.com"
            keyboardType="email-address"
          />

          <FormInput
            name="supplier_phone"
            label="Teléfono del Proveedor"
            placeholder="Número de teléfono"
            keyboardType="phone-pad"
          />

          <FormInput
            name="supplier_address"
            label="Dirección del Proveedor"
            placeholder="Dirección completa"
            multiline
            numberOfLines={3}
          />

          <Divider style={{ marginVertical: 20 }} />

          {/* Información Adicional */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información Adicional
          </Text>

          <FormInput
            name="comments"
            label="Comentarios Generales"
            placeholder="Comentarios adicionales sobre la compra"
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
    </AppForm>
  );
}
