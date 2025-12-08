import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormProSelect } from "@/components/Form/AppProSelect";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Divider,
  IconButton,
  Text,
} from "react-native-paper";
import * as Yup from "yup";
import { FormUpload } from "../Form/AppUpload";

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  is_active?: boolean;
  company_ids?: number[];
  avatar?: any;
}

interface UserFormSharedProps {
  id?: number;
  readonly?: boolean;
  mode?: "global" | "company"; // global: super admin, company: empresa específica
  companyId?: number; // ID de la empresa actual (para mode="company")
}

const userValidationSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  email: Yup.string().email("Email inválido").required("El email es requerido"),
  /* password: Yup.string().when("$isEditing", {
    is: false,
    then: (schema) =>
      schema
        .min(8, "Mínimo 8 caracteres")
        .required("La contraseña es requerida"),
    otherwise: (schema) => schema.min(8, "Mínimo 8 caracteres").notRequired(),
  }), */
});

export default function UserFormShared(props: UserFormSharedProps) {
  const { id, readonly, mode = "global", companyId } = props;
  const isEditing = !!id;
  const formRef = useRef<AppFormRef<UserFormData>>(null);
  const [showPasswordField, setShowPasswordField] = useState(!isEditing);
  const [companies, setCompanies] = useState<App.Entities.Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    if (mode === "global") {
      loadCompanies();
    }
  }, [mode]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await Services.admin.companies.index({ all: true });
      const companiesData = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setCompanies(companiesData);
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Valores iniciales según el modo
  const getInitialValues = () => {
    const base = {
      name: "",
      email: "",
      password: "",
      is_active: true,
      avatar: [],
    };

    if (mode === "company" && companyId) {
      return {
        ...base,
        company_ids: [companyId],
      };
    }

    return {
      ...base,
      company_ids: [],
    };
  };

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.users}
      id={id}
      readonly={readonly}
      validationSchema={userValidationSchema}
      initialValues={{
        ...getInitialValues(),
      }}
    >
      {/* Avatar Upload */}
      <Card style={styles.avatarCard}>
        <Card.Content>
          <View style={styles.avatarContainer}>
            <AppDependency name="avatar">
              {(value = []) => {
                const imageUri =
                  value && value.length > 0 ? value[0].uri : null;
                return (
                  <Avatar.Image
                    size={120}
                    source={
                      imageUri
                        ? { uri: imageUri }
                        : require("@/assets/images/icon.png")
                    }
                    style={styles.avatar}
                  />
                );
              }}
            </AppDependency>

            <FormUpload
              name="avatar"
              placeholder="Selecciona una foto de perfil"
              accept="images"
              multiple={true}
              maxFiles={1}
              showPreview={false}
              renderButtons={({
                handleCameraPick,
                handleImagePick,
                uploading,
                disabled,
              }) => (
                <View style={styles.avatarButtons}>
                  <IconButton
                    icon="camera"
                    size={24}
                    iconColor={palette.primary}
                    containerColor={palette.primary + "20"}
                    onPress={handleCameraPick}
                    disabled={disabled || uploading}
                    style={styles.avatarButton}
                  />
                  <IconButton
                    icon="image"
                    size={24}
                    iconColor={palette.secondary}
                    containerColor={palette.secondary + "20"}
                    onPress={handleImagePick}
                    disabled={disabled || uploading}
                    style={styles.avatarButton}
                  />
                </View>
              )}
            />
          </View>
        </Card.Content>
      </Card>

      <Divider style={{ marginVertical: 24 }} />

      <Text
        variant="titleMedium"
        style={{
          marginBottom: 16,
          fontWeight: "bold",
          color: palette.text,
        }}
      >
        Información del Usuario
      </Text>

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

      {isEditing && !showPasswordField && (
        <Button
          mode="outlined"
          icon="lock-reset"
          onPress={() => setShowPasswordField(true)}
          style={{ marginBottom: 16 }}
          textColor={palette.primary}
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
          autoCapitalize="none"
          required={!isEditing}
        />
      )}

      {isEditing && <FormCheckBox name="is_active" text="Usuario Activo" />}

      {/* Solo mostrar empresas en modo global */}
      {mode === "global" && (
        <>
          <Divider style={{ marginVertical: 24 }} />

          <Text
            variant="titleMedium"
            style={{
              marginBottom: 16,
              fontWeight: "bold",
              color: palette.text,
            }}
          >
            Empresas Asignadas
          </Text>

          <Text
            variant="bodySmall"
            style={{ marginBottom: 16, color: palette.textSecondary }}
          >
            Selecciona las empresas a las que este usuario tendrá acceso. Podrá
            crear y gestionar workers en estas empresas.
          </Text>

          {loadingCompanies ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={palette.primary} />
              <Text style={{ marginLeft: 8, color: palette.textSecondary }}>
                Cargando empresas...
              </Text>
            </View>
          ) : companies.length > 0 ? (
            <FormProSelect
              name="company_ids"
              label="Empresas"
              multiple
              placeholder="Seleccione las empresas"
              model="admin.companies"
            />
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text
                  style={{
                    textAlign: "center",
                    color: palette.textSecondary,
                  }}
                >
                  No hay empresas disponibles. Crea una empresa primero.
                </Text>
              </Card.Content>
            </Card>
          )}
        </>
      )}

      {/* Mensaje para modo company */}
      {mode === "company" && (
        <>
          <Divider style={{ marginVertical: 24 }} />
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary }}
              >
                Este usuario será asignado automáticamente a la empresa actual.
              </Text>
            </Card.Content>
          </Card>
        </>
      )}

      <View style={{ height: 40 }} />
    </AppForm>
  );
}

const styles = StyleSheet.create({
  avatarCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
  },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  avatar: {
    backgroundColor: palette.primary + "20",
    marginBottom: 16,
  },
  avatarButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  avatarButton: {
    margin: 0,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: palette.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: palette.card,
    padding: 16,
    borderRadius: 12,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  infoCard: {
    backgroundColor: palette.info + "10",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.blue,
    shadowColor: "transparent",
  },
});
