import AppModal, { AppModalRef } from "@/components/Feedback/Modal/AppModal";
import { FormCheckBox } from "@/components/Form/AppCheckBox";
import { FormDatePicker } from "@/components/Form/AppDatePicker";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import { FormSelectSimple } from "@/components/Form/AppSelect/AppSelect";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { AlertsProvider } from "@/hooks/useAlerts";
import useSelectedCompany from "@/hooks/useSelectedCompany";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Divider,
  Icon,
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
  user_id?: number;
  role_id?: number;
  location_id?: number;
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

  const router = useRouter();

  const { company } = useSelectedCompany();
  const { location } = useAuth();

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.workers}
      id={workerId}
      readonly={props.readonly}
      onSuccess={() => router.back()}
      initialValues={{
        location_id: location?.id,
        company_id: company?.id || undefined,
        position: "",
        department: "",
        hire_date: new Date().toISOString().split("T")[0],
        salary: "",
        user_id: undefined,
        role_id: undefined,
        is_active: true,
      }}
    >
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          {/* Información del usuario asociado */}
          <UserInformation isEditing={isEditing} />

          <Divider style={{ marginVertical: 24 }} />

          {/* Información básica del trabajador */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 8, fontWeight: "bold", color: palette.text }}
          >
            Información del Trabajador
          </Text>

          <Text
            variant="bodySmall"
            style={{ marginBottom: 16, color: palette.textSecondary }}
          >
            Datos específicos del trabajador en esta empresa
          </Text>

          <FormInput
            name="position"
            label="Posición/Cargo"
            placeholder="Ej: Gerente de Ventas"
          />

          <FormInput
            name="department"
            label="Departamento"
            placeholder="Ej: Ventas"
          />

          <FormDatePicker name="hire_date" label="Fecha de Contratación" />

          <FormInput
            name="salary"
            label="Salario"
            placeholder="Ej: 15000.00"
            keyboardType="numeric"
          />

          {isEditing && (
            <FormCheckBox name="is_active" text="Trabajador Activo" />
          )}

          <Divider style={{ marginVertical: 24 }} />

          {/* Rol y Sucursales */}
          <Text
            variant="titleMedium"
            style={{ marginBottom: 8, fontWeight: "bold", color: palette.text }}
          >
            Asignaciones
          </Text>

          <Text
            variant="bodySmall"
            style={{ marginBottom: 16, color: palette.textSecondary }}
          >
            Define el rol para la sucursal actual
          </Text>

          <View style={{ display: "none" }}>
            <FormInput name="company_id" />
            <FormInput name="location_id" />
          </View>

          <FormProSelect
            name="role_id"
            label="Rol"
            model="admin.roles"
            multiple={false}
            placeholder="Seleccione el rol del trabajador"
            required
          />

          <Text
            variant="bodyMedium"
            style={{
              marginBottom: 8,
              marginTop: 16,
              fontWeight: "500",
              color: palette.text,
            }}
          >
            Sucursal Asignada
          </Text>

          <Card style={styles.card}>
            <Card.Content>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Icon source="map-marker" size={20} color={palette.info} />
                <Text variant="bodyMedium" style={{ color: palette.text }}>
                  {location?.name || "Sin sucursal seleccionada"}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.companyDescription}>
                Esta asignacion se guarda automaticamente con la sucursal
                actual.
              </Text>
            </Card.Content>
          </Card>

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
    .min(8, "Mínimo 6 caracteres")
    .required("La contraseña es requerida"),
});

function UserInformation({ isEditing, onChange }: UserInformationProps) {
  const [users, setUsers] = useState<Array<{ value: string; label: string }>>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<AppModalRef>(null);
  const userFormRef = useRef<AppFormRef<any>>(null);
  const { company } = useSelectedCompany();

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await Services.admin.users.index({
        all: true,
        company_id: company?.id,
      });

      const userData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      setUsers(
        userData.map((user: any) => ({
          value: String(user.id),
          label: `${user.name} (${user.email})`,
        })),
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

  const handleCreateUser = async (values: FormData) => {
    try {
      // Convertir FormData a objeto plano
      const userData: any = {};
      values.forEach((value, key) => {
        userData[key] = value;
      });

      // Agregar campos adicionales como objetos/arrays nativos (no strings)
      const payload = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        is_active: true,
        company_ids: company?.id ? [company.id] : [], // Array nativo, no string
      };

      const response = await Services.admin.users.store(payload);

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
      <Text
        variant="titleMedium"
        style={{ marginBottom: 8, fontWeight: "bold", color: palette.text }}
      >
        Usuario del Sistema
      </Text>

      <Text
        variant="bodySmall"
        style={{ marginBottom: 16, color: palette.textSecondary }}
      >
        Vincula este trabajador a un usuario del sistema. Si el usuario no
        existe, créalo aquí mismo.
      </Text>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View style={{ flex: 1 }}>
          {loading ? (
            <View style={{ padding: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : (
            <>
              <InputLabel label="Usuarios de la compañia" required />
              <FormSelectSimple
                data={users}
                name="user_id"
                /*   onChange={(val) => {
                  console.log("Selected user ID:", val);

                  setInternalValue(val);
                  onChange?.(Number(val));
                }} */
                hideSearchBox={false}
                placeholder="Buscar o seleccionar usuario"
              />
            </>
          )}
        </View>

        <IconButton
          icon="account-plus"
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
        />
      </View>

      <AppModal ref={modalRef}>
        <AlertsProvider>
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
              autoCapitalize="none"
              required
            />

            <FormInput
              name="password"
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              autoCapitalize="none"
              required
            />
          </AppForm>
        </AlertsProvider>
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 1,
  },
  companyLabel: {
    fontWeight: "bold",
    fontSize: 16,
    color: palette.text,
  },
  companyDescription: {
    fontSize: 12,
    color: palette.textSecondary,
  },
});
