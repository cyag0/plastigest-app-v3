import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider } from "react-native-paper";
import * as Yup from "yup";

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  is_active?: boolean;
  role_ids?: number[];
  company_ids?: number[];
  location_ids?: number[];
}

interface UsersFormProps {
  id?: number;
  readonly?: boolean;
}

const userValidationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  password: Yup.string().when("$isEditing", {
    is: false,
    then: (schema) =>
      schema
        .min(8, "Mínimo 8 caracteres")
        .required("La contraseña es requerida"),
    otherwise: (schema) => schema.min(8, "Mínimo 8 caracteres").notRequired(),
  }),
});

export default function UsersForm(props: UsersFormProps) {
  const params = useLocalSearchParams();
  const userId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!userId;
  const formRef = useRef<AppFormRef<UserFormData>>(null);
  const { company } = useSelectedCompany();
  const [showPasswordField, setShowPasswordField] = useState(!isEditing);

  return (
    <AppForm
      ref={formRef}
      api={Services.users}
      id={userId}
      readonly={props.readonly}
      validationSchema={userValidationSchema}
      initialValues={{
        name: "",
        email: "",
        password: "",
        is_active: true,
      }}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <FormInput
            name="name"
            label="Nombre Completo"
            placeholder="Ej: Juan Pérez"
            required
          />

          <FormInput
            name="email"
            label="Correo Electrónico"
            placeholder="Ej: juan.perez@empresa.com"
            keyboardType="email-address"
            required
          />

          {isEditing && !showPasswordField && (
            <Button
              mode="outlined"
              icon="lock-reset"
              onPress={() => setShowPasswordField(true)}
              style={{ marginBottom: 16 }}
            >
              Cambiar Contraseña
            </Button>
          )}

          {showPasswordField && (
            <FormInput
              name="password"
              label={isEditing ? "Nueva Contraseña" : "Contraseña"}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              required={!isEditing}
            />
          )}

          {isEditing && <FormCheckBox name="is_active" text="Usuario Activo" />}

          <Divider style={{ marginVertical: 24 }} />

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </AppForm>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 16,
  },
  companyLabel: {
    fontWeight: "bold",
    fontSize: 16,
  },
  companyDescription: {
    fontSize: 12,
    opacity: 0.8,
  },
});
