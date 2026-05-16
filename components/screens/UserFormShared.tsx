import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  IconButton,
  Text,
} from "react-native-paper";
import * as Yup from "yup";
import LocationRoleList, { LocationRoleItem } from "../Administration/CompanyAssignmentWidget";
import { FormUpload } from "../Form/AppUpload";

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  is_active?: boolean;
  avatar?: any;
}

interface UserFormSharedProps {
  id?: number;
  readonly?: boolean;
  mode?: "global" | "company"; // global: super admin, company: empresa específica
  companyId?: number; // ID de la empresa actual (para mode="company")
}

export default function UserFormShared(props: UserFormSharedProps) {
  const { id, readonly, mode = "global", companyId } = props;
  const isEditing = !!id;
  const formRef = useRef<AppFormRef<UserFormData>>(null);
  const [showPasswordField, setShowPasswordField] = useState(!isEditing);
  const [locationRoles, setLocationRoles] = useState<LocationRoleItem[]>([]);

  // Password validation depends on whether we are creating or editing
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().required("El nombre es requerido"),
        email: Yup.string()
          .email("Email inválido")
          .required("El email es requerido"),
        password: isEditing
          ? // Editing: optional — but if the user typed something it must be ≥8 chars
            Yup.string().test(
              "password-edit",
              "Mínimo 8 caracteres",
              (v) => !v || v === "" || v.length >= 8
            )
          : // Creating: required and must be ≥8 chars
            Yup.string()
              .min(8, "Mínimo 8 caracteres")
              .required("La contraseña es requerida"),
      }),
    [isEditing]
  );

  useEffect(() => {
    if (isEditing && id) loadLocationRoles(id);
  }, [id, isEditing]);

  const loadLocationRoles = async (userId: number) => {
    try {
      const response = await Services.admin.users.show(userId);
      const user: any = response?.data?.data ?? response?.data ?? {};
      const items: any[] = user.location_roles ?? [];
      if (items.length > 0) {
        setLocationRoles(
          items.map((lr: any) => ({
            location_id: lr.location_id ?? lr.location?.id,
            role_id: lr.role_id ?? lr.role?.id,
          }))
        );
      }
    } catch {
      // silent — user may not have location_roles yet
    }
  };

  const saveLocationRoles = async (userId: number) => {
    if (locationRoles.length === 0) return;
    await (Services.admin.users.update as any)(userId, {
      location_roles: locationRoles
        .filter((lr) => lr.location_id)
        .map((lr) => ({ location_id: lr.location_id, role_id: lr.role_id })),
    });
  };

  // Valores iniciales según el modo
  const getInitialValues = () => ({
    name: "",
    email: "",
    password: "",
    is_active: true,
    avatar: [],
  });

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.users}
      id={id}
      readonly={readonly}
      validationSchema={validationSchema}
      initialValues={{
        ...getInitialValues(),
      }}
      onSuccess={async (response) => {
        const savedUserId = response?.data?.id ?? id;
        if (savedUserId) {
          try { await saveLocationRoles(savedUserId); } catch (e) { console.error(e); }
        }
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

      <FormCheckBox name="is_active" text="Usuario Activo" />

      {/* Sucursales y Roles */}
      <Divider style={{ marginVertical: 24 }} />

      <Text
        variant="titleMedium"
        style={{ marginBottom: 8, fontWeight: "bold", color: palette.text }}
      >
        Sucursales y Roles
      </Text>

      <Text
        variant="bodySmall"
        style={{ marginBottom: 16, color: palette.textSecondary }}
      >
        Asigna las sucursales donde operará el usuario y el rol que tendrá en cada una.
      </Text>

      <LocationRoleList
        value={locationRoles}
        onChange={setLocationRoles}
        readonly={readonly}
        companyId={companyId}
      />



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
