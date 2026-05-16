import AppCheckBox from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/hooks/AHooks";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface WorkerFormData {
  is_active: boolean;
  company_id: number;
  user_id?: number;
  role_id?: number;
  location_ids?: number[];
}

interface CurrentWorkerFormProps {
  id?: number;
  readonly?: boolean;
}

const validationSchema = Yup.object().shape({
  user_id: Yup.number().required("Debes seleccionar un usuario"),
  role_id: Yup.number(),
});

export default function CurrentWorkerForm(props: CurrentWorkerFormProps) {
  const params = useLocalSearchParams();
  const workerId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!workerId;
  const formRef = useRef<AppFormRef<WorkerFormData>>(null);

  const router = useRouter();
  const { company } = useSelectedCompany();
  const { location } = useAuth();

  const [users, setUsers] = useState<App.Entities.User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useAsync(async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        Services.admin.users.index({ company_id: company?.id, all: true }),
        Services.admin.roles.index({ company_id: company?.id, all: true }),
      ]);
      setUsers(
        Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
      );
      setRoles(
        Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data?.data || []
      );
    } catch (error) {
      console.error("Error loading data:", error);
    }
  });

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
      api={Services.admin.workers}
      id={workerId}
      readonly={props.readonly}
      onSuccess={() => router.back()}
      initialValues={{
        location_ids: [location.id],
        company_id: company?.id || undefined,
        user_id: undefined,
        role_id: undefined,
        is_active: true,
      }}
      validationSchema={validationSchema}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Usuario y Rol */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <IconButton
                icon="account"
                size={24}
                iconColor={palette.primary}
                style={{ margin: 0 }}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Usuario y Acceso
              </Text>
            </View>

            <FormSelectSimple
              name="user_id"
              label="Usuario"
              placeholder="Selecciona un usuario"
              data={users.map((user) => ({
                label: user.name,
                value: user.id,
              }))}
              required
              disabled={isEditing}
            />

            <FormSelectSimple
              name="role_id"
              label="Rol"
              placeholder="Selecciona un rol (opcional)"
              data={roles.map((role) => ({

                label: role.name,
                value: role.id,
              }))}
            />
          </Card.Content>
        </Card>

        {/* Estado */}
        <Card style={styles.card}>
          <Card.Content>
            <AppCheckBox name="is_active" label="Usuario Activo" />
          </Card.Content>
        </Card>

        {/* Nota informativa sobre sucursal */}
        {!isEditing && (
          <Card style={[styles.card, styles.infoCard]}>
            <Card.Content>
              <View style={styles.infoContent}>
                <IconButton
                  icon="map-marker"
                  size={24}
                  iconColor={palette.info}
                  style={{ margin: 0 }}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={styles.infoText}>
                    Este usuario será asignado a la sucursal:{" "}
                    <Text style={{ fontWeight: "700" }}>{location.name}</Text>
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
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
