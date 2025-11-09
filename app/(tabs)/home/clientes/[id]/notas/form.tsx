import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormRadioButton } from "@/components/Form/AppRadioButton";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import Services from "@/utils/services";
import React, { useRef } from "react";
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import * as Yup from "yup";

// Esquema de validación
const validationSchema = Yup.object().shape({
  description: Yup.string()
    .required("La descripción es requerida")
    .min(3, "La descripción debe tener al menos 3 caracteres"),
  amount: Yup.number()
    .required("El monto es requerido")
    .min(0.01, "El monto debe ser mayor a 0")
    .typeError("El monto debe ser un número válido"),
  status: Yup.string()
    .required("El estado es requerido")
    .oneOf(["pending", "paid"], "El estado debe ser pendiente o pagado"),
  due_date: Yup.date()
    .nullable()
    .typeError("La fecha debe ser válida"),
});

export default function NotaFormScreen() {
  const params = useLocalSearchParams();
  const customerId = Array.isArray(params.id) ? params.id[0] : params.id;
  const formRef = useRef<AppFormRef<any>>(null);
  const { selectedCompany } = useAuth();

  const handleSuccess = () => {
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#666" />
          <Text style={styles.backText}>Volver</Text>
        </TouchableOpacity>
      </View>
      
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Nueva Nota</Text>
        
        <AppForm
          ref={formRef}
          api={Services.home.customerNotes}
          validationSchema={validationSchema}
          onSuccess={handleSuccess}
          initialValues={{
            customer_id: Number(customerId),
            company_id: selectedCompany?.id,
            status: "pending",
          }}
        >
          <FormInput
            name="description"
            label="Descripción"
            placeholder="Ej: Saldo pendiente de factura #1234"
            multiline
            numberOfLines={3}
          />

          <FormInput
            name="amount"
            label="Monto"
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <FormRadioButton
            name="status"
            label="Estado"
            options={[
              { label: "Pendiente", value: "pending" },
              { label: "Pagada", value: "paid" },
            ]}
          />

          <FormDatePicker
            name="due_date"
            label="Fecha de Vencimiento (Opcional)"
          />
        </AppForm>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
});
