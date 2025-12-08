import AppCheckBox from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAsync } from "@/hooks/AHooks";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Icon, IconButton, Text } from "react-native-paper";
import * as Yup from "yup";

interface WorkerFormData {
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: string;
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
  position: Yup.string().required("El cargo es obligatorio"),
  department: Yup.string(),
  hire_date: Yup.string().required("La fecha de contratación es obligatoria"),
  salary: Yup.number().min(0, "El salario debe ser mayor o igual a 0"),
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
  const [roles, setRoles] = useState<App.Entities.Role[]>([]);
  const [worker, setWorker] = useState<App.Entities.Worker | null>(null);

  useAsync(async () => {
    try {
      const promises = [
        Services.admin.users.index({ company_id: company?.id, all: true }),
        Services.admin.roles.index({ company_id: company?.id, all: true }),
      ];

      // Si estamos editando, cargar el trabajador para obtener sus sucursales
      if (isEditing && workerId) {
        promises.push(Services.admin.workers.show(workerId));
      }

      const [usersRes, rolesRes, workerRes] = await Promise.all(promises);

      setUsers(
        Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.data || []
      );
      setRoles(
        Array.isArray(rolesRes.data) ? rolesRes.data : rolesRes.data?.data || []
      );

      if (workerRes) {
        setWorker(workerRes.data?.data || workerRes.data);
      }
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
        location_ids: [location.id], // Solo la sucursal actual
        company_id: company?.id || undefined,
        position: "",
        department: "",
        hire_date: new Date().toISOString().split("T")[0],
        salary: "",
        user_id: undefined,
        role_id: undefined,
        is_active: true,
      }}
      validationSchema={validationSchema}
      title={isEditing ? "Editar Trabajador" : "Nuevo Trabajador"}
      submitButtonText={isEditing ? "Actualizar" : "Crear Trabajador"}
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
              options={users.map((user) => ({
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
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
          </Card.Content>
        </Card>

        {/* Información Laboral */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <IconButton
                icon="briefcase"
                size={24}
                iconColor={palette.info}
                style={{ margin: 0 }}
              />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Información Laboral
              </Text>
            </View>

            <FormInput
              name="position"
              label="Cargo"
              placeholder="Ej: Cajero, Almacenero, Gerente"
              required
            />

            <FormInput
              name="department"
              label="Departamento"
              placeholder="Ej: Ventas, Almacén, Administración"
            />

            <FormDatePicker
              name="hire_date"
              label="Fecha de Contratación"
              required
            />

            <FormInput
              name="salary"
              label="Salario"
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <AppCheckBox name="is_active" label="Trabajador Activo" />
          </Card.Content>
        </Card>

        {/* Nota informativa sobre sucursal */}
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
                  {isEditing
                    ? "Las sucursales asignadas se muestran a continuación. Solo puedes gestionar trabajadores de tu sucursal actual."
                    : `Este trabajador se asignará automáticamente a: ${location.name}`}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Mostrar sucursales asignadas si está editando */}
        {isEditing && worker?.locations && worker.locations.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <IconButton
                  icon="map-marker-multiple"
                  size={24}
                  iconColor={palette.secondary}
                  style={{ margin: 0 }}
                />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Sucursales Asignadas
                </Text>
              </View>

              <Text variant="bodySmall" style={styles.readOnlyNote}>
                Las sucursales se gestionan desde el módulo de trabajadores
                global
              </Text>

              <View style={styles.locationsContainer}>
                {worker.locations.map((loc) => (
                  <View key={loc.id} style={styles.locationItem}>
                    <Icon
                      source="map-marker"
                      size={20}
                      color={
                        loc.id === location.id
                          ? palette.secondary
                          : palette.primary
                      }
                    />
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.locationName,
                        loc.id === location.id && styles.currentLocationName,
                      ]}
                    >
                      {loc.name}
                    </Text>
                    {loc.id === location.id && (
                      <Chip
                        compact
                        style={styles.currentBadge}
                        textStyle={styles.currentBadgeText}
                      >
                        ACTUAL
                      </Chip>
                    )}
                  </View>
                ))}
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
  readOnlyNote: {
    color: palette.textSecondary,
    fontStyle: "italic",
    marginBottom: 16,
    opacity: 0.8,
  },
  locationsContainer: {
    gap: 12,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: palette.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border || "#e0e0e0",
  },
  locationName: {
    flex: 1,
    color: palette.text,
    fontWeight: "500",
  },
  currentLocationName: {
    color: palette.secondary,
    fontWeight: "600",
  },
  currentBadge: {
    backgroundColor: palette.secondary,
  },
  currentBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
