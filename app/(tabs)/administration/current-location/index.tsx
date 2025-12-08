import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React, { useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface LocationFormData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  is_active: boolean;
}

const validationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es obligatorio"),
  address: Yup.string(),
  phone: Yup.string(),
  email: Yup.string().email("Email inválido"),
  city: Yup.string(),
  state: Yup.string(),
  country: Yup.string(),
  postal_code: Yup.string(),
});

export default function CurrentLocationScreen() {
  const { location } = useAuth();
  const router = useRouter();
  const formRef = useRef<AppFormRef<LocationFormData>>(null);

  if (!location) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconButton
            icon="alert-circle"
            size={64}
            iconColor={palette.warning}
          />
          <Text variant="titleLarge" style={styles.emptyTitle}>
            Sin Sucursal Seleccionada
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Debes seleccionar una sucursal primero
          </Text>
        </View>
      </View>
    );
  }

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.locations}
      id={location.id}
      onSuccess={() => router.back()}
      initialValues={{
        name: "",
        address: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        country: "",
        postal_code: "",
        is_active: true,
      }}
      validationSchema={validationSchema}
      title="Mi Sucursal"
      submitButtonText="Guardar Cambios"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Información Básica */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <IconButton
                icon="store"
                size={24}
                iconColor={palette.primary}
                style={{ margin: 0 }}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Información de la Sucursal
              </Text>
            </View>

            <FormInput
              name="name"
              label="Nombre de la Sucursal"
              placeholder="Ej: Sucursal Centro"
              required
            />

            <FormInput
              name="address"
              label="Dirección"
              placeholder="Calle, número, colonia"
              multiline
              numberOfLines={2}
            />

            <View style={styles.row}>
              <FormInput
                name="phone"
                label="Teléfono"
                placeholder="+51 999 999 999"
                keyboardType="phone-pad"
                containerStyle={{ flex: 1 }}
              />
              <FormInput
                name="email"
                label="Email"
                placeholder="sucursal@empresa.com"
                keyboardType="email-address"
                containerStyle={{ flex: 1 }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Ubicación */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <IconButton
                icon="map-marker"
                size={24}
                iconColor={palette.info}
                style={{ margin: 0 }}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Ubicación Geográfica
              </Text>
            </View>

            <FormInput name="city" label="Ciudad" placeholder="Ej: Lima" />

            <View style={styles.row}>
              <FormInput
                name="state"
                label="Departamento/Estado"
                placeholder="Ej: Lima"
                containerStyle={{ flex: 1 }}
              />
              <FormInput
                name="postal_code"
                label="Código Postal"
                placeholder="15001"
                keyboardType="numeric"
                containerStyle={{ flex: 1 }}
              />
            </View>

            <FormInput name="country" label="País" placeholder="Ej: Perú" />
          </Card.Content>
        </Card>

        {/* Nota informativa */}
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <View style={styles.infoContent}>
              <IconButton
                icon="information"
                size={24}
                iconColor={palette.info}
                style={{ margin: 0 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.infoText}>
                  Solo puedes editar la información de tu sucursal actual (
                  {location.name}).
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.infoText, { marginTop: 4 }]}
                >
                  Para gestionar todas las sucursales, contacta al administrador
                  de la empresa.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </AppForm>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: "600",
    color: palette.text,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    backgroundColor: palette.info + "10",
    borderLeftWidth: 4,
    borderLeftColor: palette.info,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontWeight: "700",
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
  },
});
