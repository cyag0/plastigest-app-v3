import AppModal, { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import AppCheckBox, { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import AppSelect from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams } from "expo-router";
import { useFormikContext } from "formik";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Divider,
  IconButton,
  Text,
} from "react-native-paper";
import * as Yup from "yup";

interface WorkerFormData {
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: string;
  is_active: boolean;
  company_id: number;
  name: string;
  email: string;
  password?: string;
  role_ids?: number[];
  company_ids?: number[];
  location_ids?: number[];
}

interface WorkersFormProps {
  id?: number;
  readonly?: boolean;
}

export default function WorkersForm(props: WorkersFormProps) {
  const params = useLocalSearchParams();
  const workerId =
    props.id || (params.id ? parseInt(params.id as string) : undefined);
  const isEditing = !!workerId;
  const formRef = useRef<AppFormRef<WorkerFormData>>(null);

  const { company } = useSelectedCompany();

  const [locations, setLocations] = useState<App.Entities.Location[]>([]);

  const [loadingLocations, setLoadingLocations] = useState(false);

  // Hook para observar cambios en company_ids
  const { values } = {
    values: {
      company_ids: [],
      location_ids: [],
      role_ids: [],
    },
  };

  useAsync(async () => {
    try {
      const locations = await Services.admin.locations.index({
        company_id: company?.id,
        all: true,
      });

      const locationData = Array.isArray(locations.data)
        ? locations.data
        : locations.data?.data || [];
      setLocations(locationData);

      console.log("Fetched locations on mount:", locations);
    } catch (error) {
      console.error("Error fetching locations on mount:", error);
    }
  });

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.workers}
      id={workerId}
      readonly={props.readonly}
      initialValues={{
        location_ids: [],
        company_ids: [],
        role_ids: [],
        company_id: company?.id || undefined,
        position: "Administrador",
        department: "Test",
        hire_date: new Date().toISOString().split("T")[0],
        salary: "50000.00",
        user: {
          name: "Juan Pérez",
          email: "juan.perez@empresa.com",
          password: "Cesar123**",
        },
      }}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Información básica del trabajador */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Información del Trabajador
          </Text>

          <FormInput
            name="position"
            label="Posición/Cargo"
            placeholder="Ej: Desarrollador Senior"
          />

          <FormInput
            name="department"
            label="Departamento"
            placeholder="Ej: Tecnología"
          />

          <FormDatePicker name="hire_date" label="Fecha de Contratación" />

          <FormInput
            name="salary"
            label="Salario"
            placeholder="Ej: 50000.00"
            keyboardType="numeric"
          />

          {props.id && (
            <FormCheckBox name="is_active" text="Trabajador Activo" />
          )}

          <Divider style={{ marginVertical: 24 }} />

          {/* Información del usuario asociado */}
          <UserInformation
            value={formRef.current?.getFieldValue("user_id")}
            onChange={(userId) =>
              formRef.current?.setFieldValue("user_id", userId)
            }
            isEditing={isEditing}
          />

          <Divider style={{ marginVertical: 24 }} />

          {/* Relaciones */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 16, fontWeight: "bold" }}
          >
            Asignaciones
          </Text>

          <View style={{ display: "none" }}>
            <FormInput name="company_id" />
          </View>

          <FormProSelect
            name="role_ids"
            label="Roles"
            model="admin.roles"
            multiple={true}
            placeholder="Seleccione los roles del trabajador"
          />

          {/* Ubicaciones organizadas por compañía */}
          {locations.length > 0 && (
            <>
              <Text
                variant="bodyMedium"
                style={{ marginBottom: 16, fontWeight: "500" }}
              >
                Ubicaciones de la Compañía
              </Text>

              {loadingLocations ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text style={{ marginLeft: 8 }}>Cargando ubicaciones...</Text>
                </View>
              ) : (
                <Card style={styles.card}>
                  <View>
                    <Card.Title
                      title={company?.name || `Empresa ID: ${company?.name}`}
                      titleStyle={styles.companyLabel}
                      subtitle={`Seleccione las ubicaciones`}
                      subtitleStyle={styles.companyDescription}
                    />
                    <View>
                      {locations.map((location) => {
                        return (
                          <LocationCheckBox
                            formRef={formRef as any}
                            key={location.id}
                            location={location}
                          />
                        );
                      })}
                    </View>
                  </View>
                </Card>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </AppForm>
  );
}

// Componente UserInformation
interface UserInformationProps {
  value?: number;
  onChange?: (userId: number) => void;
  isEditing?: boolean;
}

const userValidationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  password: Yup.string()
    .min(6, "Mínimo 6 caracteres")
    .required("La contraseña es requerida"),
});

function UserInformation({ value, onChange, isEditing }: UserInformationProps) {
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>(
    []
  );
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<AppModalRef>(null);
  const userFormRef = useRef<AppFormRef<any>>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await Services.admin.users.index({
        paginated: false,
      });

      const userData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setUsers(
        userData.map((user: any) => ({
          value: String(user.id),
          label: `${user.name} (${user.email})`,
        }))
      );
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (values: any) => {
    try {
      const response = await Services.users.store({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      const newUser = response.data.data;

      // Agregar el nuevo usuario a la lista
      setUsers((prev) => [
        ...prev,
        {
          value: String(newUser.id),
          label: `${newUser.name} (${newUser.email})`,
        },
      ]);

      // Seleccionar automáticamente el nuevo usuario
      onChange?.(newUser.id);

      // Cerrar modal y resetear formulario
      modalRef.current?.hide();
      userFormRef.current?.resetForm();
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  };

  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text
            variant="bodyMedium"
            style={{ marginBottom: 8, fontWeight: "500" }}
          >
            Usuario del Sistema
          </Text>
          {loading ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : (
            <AppSelect
              data={users}
              value={value}
              onChange={(val) => onChange?.(Number(val))}
              hideSearchBox={false}
            />
          )}
        </View>

        <IconButton
          icon="plus"
          mode="contained"
          iconColor="white"
          containerColor={palette.primary}
          size={24}
          onPress={() =>
            modalRef.current?.show({
              title: "Crear Nuevo Usuario",
              dismissable: true,
              width: "90%",
            })
          }
          style={{ marginTop: 28 }}
        />
      </View>

      <AppModal ref={modalRef}>
        <AppForm
          ref={userFormRef}
          validationSchema={userValidationSchema}
          initialValues={{
            name: "",
            email: "",
            password: "",
          }}
          onSubmit={handleCreateUser}
        >
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

          <FormInput
            name="password"
            label="Contraseña"
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            required
          />
        </AppForm>
      </AppModal>
    </>
  );
}

function LocationCheckBox({
  location,
  key,
  formRef,
}: {
  location: App.Entities.Location;
  key: number;
  formRef: React.RefObject<AppFormRef<any>>;
}) {
  const form = useFormikContext<WorkerFormData>();

  const [value, setValue] = useState(false);

  useEffect(() => {
    const initialValue =
      form.values.location_ids?.includes(location.id) || false;

    setValue(initialValue);
  }, []);

  return (
    <AppCheckBox
      onChange={(value) => {
        const currentLocationsSelected =
          formRef.current?.getFieldValue("location_ids") || [];
        if (value) {
          // Agregar ubicación
          formRef.current?.setFieldValue("location_ids", [
            ...currentLocationsSelected,
            location.id,
          ]);
        } else {
          // Remover ubicación
          formRef.current?.setFieldValue(
            "location_ids",
            currentLocationsSelected.filter((id: number) => id !== location.id)
          );
        }
        setValue(value);
      }}
      value={value}
      text={location.name}
    />
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
