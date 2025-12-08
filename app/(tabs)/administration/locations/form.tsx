import AppForm from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import { useSelectedCompany } from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("El nombre es obligatorio")
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  description: Yup.string().max(
    1000,
    "La descripción no puede exceder 1000 caracteres"
  ),
  address: Yup.string()
    .required("La dirección es obligatoria")
    .min(5, "La dirección debe tener al menos 5 caracteres")
    .max(500, "La dirección no puede exceder 500 caracteres"),
  phone: Yup.string().max(20, "El teléfono no puede exceder 20 caracteres"),
  email: Yup.string()
    .email("Debe ser un email válido")
    .max(255, "El email no puede exceder 255 caracteres"),
  is_active: Yup.boolean(),
});

interface LocationFormProps {
  id?: number;
  readonly?: boolean;
}
export default function LocationFormScreen(props: LocationFormProps) {
  const params = useLocalSearchParams();
  const locationId = params.id as string;
  const isEditing = !!locationId;
  const { company: selectedCompany } = useSelectedCompany();

  if (selectedCompany == null) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          No se ha seleccionado una compañía. Por favor, selecciona una compañía
          para continuar.
        </Text>
      </View>
    );
  }

  return (
    <AppForm
      id={locationId}
      submitButtonText={isEditing ? "Actualizar Sucursal" : "Crear Sucursal"}
      api={Services.admin.locations}
      onSuccess={() => {
        router.back();
      }}
      initialValues={{
        name: "",
        description: "",
        address: "",
        phone: "",
        email: "",
        company_id: selectedCompany?.id,
        is_active: true,
      }}
      readonly={locationId ? props.readonly : false}
      validationSchema={validationSchema}
    >
      {/* Información básica */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Información Básica
        </Text>

        <FormInput
          name="name"
          label="Nombre de la sucursal"
          placeholder="Ej: Sucursal Centro, Almacén Norte"
          required
        />

        <FormInput
          name="description"
          label="Descripción"
          placeholder="Descripción de la sucursal (opcional)"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Información de contacto */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Ubicación y Contacto
        </Text>

        <FormInput
          name="address"
          label="Dirección"
          placeholder="Dirección completa de la sucursal"
          required
          multiline
          numberOfLines={2}
        />

        <FormInput
          name="phone"
          label="Teléfono"
          placeholder="Ej: +52 55 1234 5678"
          keyboardType="phone-pad"
        />

        <FormInput
          name="email"
          label="Email"
          placeholder="email@sucursal.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Información de la compañía (solo informativa) */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Compañía
        </Text>

        <View style={styles.companyInfo}>
          <Text variant="bodyMedium" style={styles.companyLabel}>
            Esta sucursal pertenece a:
          </Text>
          <Text variant="titleSmall" style={styles.companyName}>
            {selectedCompany.name}
          </Text>
          <Text variant="bodySmall" style={styles.companyBusinessName}>
            {selectedCompany.business_name}
          </Text>
        </View>
      </View>

      {/* Estado */}
      {/* <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Estado
        </Text>

        <View style={styles.switchContainer}>
          <View style={styles.switchLabelContainer}>
            <Text variant="bodyLarge" style={styles.switchLabel}>
              Sucursal activa
            </Text>
            <Text variant="bodySmall" style={styles.switchDescription}>
              Las sucursales inactivas no aparecen en las operaciones
            </Text>
          </View>
          <FormCheckBox name="is_active" label="" text="Sucursal activa" />
        </View>
      </View> */}
    </AppForm>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    textAlign: "center",
    color: palette.error,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: palette.textSecondary,
    fontWeight: "600",
    marginBottom: 16,
  },
  companyInfo: {
    backgroundColor: palette.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  companyLabel: {
    color: palette.textSecondary,
    marginBottom: 4,
  },
  companyName: {
    color: palette.primary,
    fontWeight: "700",
    marginBottom: 2,
  },
  companyBusinessName: {
    color: palette.textSecondary,
    opacity: 0.8,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    elevation: 1,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    color: palette.text,
    fontWeight: "500",
  },
  switchDescription: {
    color: palette.textSecondary,
    opacity: 0.7,
    marginTop: 2,
  },
});
