import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import Services from "@/utils/services";
import React, { useRef, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Yup from "yup";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

interface ClienteFormData {
  name: string;
  business_name?: string;
  social_reason?: string;
  rfc?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  company_id?: number;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  email: Yup.string().email("Email inválido").nullable(),
});

interface ClienteFormProps {
  id?: number;
  readonly?: boolean;
}

const ClienteForm = ({ id, readonly }: ClienteFormProps) => {
  const formRef = useRef<AppFormRef<ClienteFormData>>(null);
  const { company, availableCompanies, selectCompany } = useSelectedCompany();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!company && availableCompanies && availableCompanies.length > 0) {
      selectCompany(availableCompanies[0]);
    }
    setIsReady(true);
  }, [company, availableCompanies]);

  if (!isReady || !company) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
        <AppForm
          ref={formRef}
          api={Services.home.clientes}
          validationSchema={validationSchema}
          initialValues={{
            name: "",
            business_name: "",
            social_reason: "",
            rfc: "",
            address: "",
            phone: "",
            email: "",
            is_active: true,
            company_id: company.id,
          }}
          id={id}
          readonly={readonly}
          onSuccess={() => {
            router.back();
          }}
        >
          <FormInput
            name="name"
            label="Nombre *"
            placeholder="Nombre del cliente"
          />
          <FormInput
            name="business_name"
            label="Razón Social"
            placeholder="Razón social"
          />
          <FormInput
            name="social_reason"
            label="Razón Comercial"
            placeholder="Razón comercial"
          />
          <FormInput
            name="rfc"
            label="RFC"
            placeholder="RFC del cliente"
          />
          <FormInput
            name="address"
            label="Dirección"
            placeholder="Dirección completa"
            multiline
            numberOfLines={3}
          />
          <FormInput
            name="phone"
            label="Teléfono"
            placeholder="Teléfono de contacto"
            keyboardType="phone-pad"
          />
          <FormInput
            name="email"
            label="Email"
            placeholder="Email de contacto"
            keyboardType="email-address"
          />
          <FormCheckBox
            name="is_active"
            label="Activo"
          />
        </AppForm>
      </View>
    </ScrollView>
  );
};

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
});

export default ClienteForm;
