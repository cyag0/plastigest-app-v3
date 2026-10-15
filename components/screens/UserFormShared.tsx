import RolePicker from "@/components/Administration/Users/RolePicker";
import UserAvatar from "@/components/Administration/Users/UserAvatar";
import { UserScope, shortLocationName } from "@/components/Administration/Users/userDisplay";
import { useUserScope } from "@/components/Administration/Users/useUserScope";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import MakeForm from "@/components/Form/AppForm/hoc";
import { FormInput } from "@/components/Form/AppInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import * as Yup from "yup";
import LocationRoleList, { LocationRoleItem } from "../Administration/CompanyAssignmentWidget";
import { FormUpload } from "../Form/AppUpload";

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  is_active?: boolean;
  avatar?: any;
  /** Solo en la sucursal: su rol en la sucursal actual. */
  location_role_id?: number;
}

interface UserFormSharedProps {
  id?: number;
  /**
   * global: administrador del sistema; company: usuarios de la empresa (con
   * todas sus sucursales); location: usuarios de la sucursal actual (solo su
   * rol aquí).
   */
  mode?: UserScope;
  companyId?: number;
}

const FormRolePicker = MakeForm(RolePicker, { label: false });

/**
 * Alta y edición de usuarios. En celular cabe en una pantalla: foto chica a
 * un lado del nombre, los datos, y al final el acceso (el rol en la sucursal
 * o las sucursales y roles en la empresa).
 */
export default function UserFormShared(props: UserFormSharedProps) {
  const { id, companyId } = props;
  const mode = useUserScope(props.mode ?? "global");
  const isEditing = !!id;
  const isBranch = mode === "location";
  const navigation = useNavigation();
  const styles = useThemedStyles(makeStyles);
  const { location, selectedCompany } = useAuth();
  const formRef = useRef<AppFormRef<UserFormData>>(null);
  const [showPasswordField, setShowPasswordField] = useState(!isEditing);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [locationRoles, setLocationRoles] = useState<LocationRoleItem[]>([]);
  // Se envían solo si se tocaron: así quitar todas las sucursales sí se
  // guarda, y una carga fallida no borra las que ya tenía.
  const [locationRolesTouched, setLocationRolesTouched] = useState(false);

  const branch = shortLocationName(location?.name ?? "esta sucursal", selectedCompany?.name);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? "Editar usuario" : "Nuevo usuario" });
  }, [navigation, isEditing]);

  // Password validation depends on whether we are creating or editing
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().trim().required("El nombre es requerido"),
        email: Yup.string().email("Email inválido").required("El email es requerido"),
        password: isEditing
          ? // Editing: optional — but if the user typed something it must be ≥8 chars
            Yup.string().test("password-edit", "Mínimo 8 caracteres", (v) => !v || v.length >= 8)
          : // Creating: required and must be ≥8 chars
            Yup.string().min(8, "Mínimo 8 caracteres").required("La contraseña es requerida"),
        ...(isBranch
          ? { location_role_id: Yup.number().required("Elige su rol en esta sucursal").typeError("Elige su rol en esta sucursal") }
          : {}),
      }),
    [isEditing, isBranch],
  );

  // Solo los campos que se editan aquí: el detalle trae además sus
  // sucursales, empresas y roles, que no deben reenviarse con el formulario
  // (en la sucursal, reenviar todas las sucursales ni siquiera está permitido).
  const loadInitialValues = useCallback(async (): Promise<UserFormData> => {
    const empty: UserFormData = { name: "", email: "", password: "", is_active: true, avatar: [] };
    if (!id) return empty;

    const response: any = await Services.admin.users.show(id);
    const user: App.Entities.User = response?.data?.data ?? response?.data ?? {};

    if (!isBranch) {
      setLocationRoles(
        (user.location_roles ?? []).map((lr) => ({
          location_id: lr.location_id,
          role_id: lr.role_id ?? undefined,
        })),
      );
    }

    return {
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      is_active: user.is_active ?? true,
      avatar: user.avatar ?? [],
      ...(isBranch ? { location_role_id: user.location_role?.role_id ?? undefined } : {}),
    };
  }, [id, isBranch]);

  const saveLocationRoles = async (userId: number) => {
    if (isBranch || !locationRolesTouched) return;
    const items = locationRoles
      .filter((lr) => lr.location_id)
      .map((lr) => ({ location_id: lr.location_id, role_id: lr.role_id }));
    await (Services.admin.users.update as any)(userId, {
      // Se envía como multipart y un arreglo vacío no viaja: "" llega como
      // null y el backend lo toma como "sin sucursales".
      location_roles: items.length > 0 ? items : "",
    });
  };

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.users}
      id={id}
      validationSchema={validationSchema}
      initialValues={loadInitialValues}
      showResetButton={false}
      submitButtonText={isEditing ? "Guardar cambios" : "Crear usuario"}
      onSuccess={async (response) => {
        const savedUserId = response?.data?.id ?? id;
        if (savedUserId) {
          try {
            await saveLocationRoles(savedUserId);
          } catch (e) {
            console.error(e);
          }
        }
        goBack();
      }}
    >
      <View style={styles.wrapper}>
        {/* Foto: chica, al lado; antes ocupaba media pantalla con el logo de la app. */}
        <View style={styles.photoRow}>
          <AppDependency name="name">
            {(name) => (
              <AppDependency name="avatar">
                {(avatar) => <UserAvatar name={name} uri={avatar?.[0]?.uri} size={64} />}
              </AppDependency>
            )}
          </AppDependency>
          <View style={styles.photoBody}>
            <Text style={styles.photoLabel}>Foto (opcional)</Text>
            <FormUpload
              name="avatar"
              accept="images"
              multiple={false}
              maxFiles={1}
              showPreview={false}
              containerStyle={{ marginBottom: 0 }}
              renderButtons={({ handleCameraPick, handleImagePick, uploading, disabled }) => (
                <View style={styles.photoButtons}>
                  <Button
                    compact
                    mode="outlined"
                    icon="camera-outline"
                    onPress={handleCameraPick}
                    disabled={disabled || uploading}
                  >
                    Cámara
                  </Button>
                  <Button
                    compact
                    mode="outlined"
                    icon="image-outline"
                    onPress={handleImagePick}
                    disabled={disabled || uploading}
                  >
                    Galería
                  </Button>
                </View>
              )}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Datos</Text>
        <FormInput name="name" label="Nombre completo" placeholder="Ej: Juan Pérez" required autoCapitalize="words" />
        <FormInput
          name="email"
          label="Correo electrónico"
          placeholder="Ej: juan@empresa.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          required
        />

        {showPasswordField ? (
          <FormInput
            name="password"
            label={isEditing ? "Nueva contraseña" : "Contraseña"}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            required={!isEditing}
            right={
              <TextInput.Icon
                icon={passwordVisible ? "eye-off-outline" : "eye-outline"}
                onPress={() => setPasswordVisible((v) => !v)}
                forceTextInputFocus={false}
              />
            }
          />
        ) : (
          <Button
            mode="text"
            icon="lock-reset"
            onPress={() => setShowPasswordField(true)}
            style={styles.passwordButton}
            contentStyle={{ justifyContent: "flex-start" }}
          >
            Cambiar contraseña
          </Button>
        )}

        {isEditing && (
          <View style={styles.switchBox}>
            <FormSwitch name="is_active" text="Usuario activo" />
            <Text style={styles.helper}>Si lo desactivas no puede entrar a la app y se cierran sus sesiones.</Text>
          </View>
        )}

        {/* Acceso */}
        {isBranch ? (
          <>
            <Text style={styles.sectionTitle}>Rol en {branch}</Text>
            <Text style={styles.helper}>
              {isEditing
                ? "Solo cambia su rol en esta sucursal; sus otras sucursales no se tocan."
                : "Queda con acceso a esta sucursal con el rol que elijas."}
            </Text>
            <FormRolePicker name="location_role_id" containerStyle={{ marginTop: tokens.spacing[3] }} />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Sucursales y roles</Text>
            <Text style={styles.helper}>Las sucursales a las que puede entrar y su rol en cada una.</Text>
            <View style={{ marginTop: tokens.spacing[3] }}>
              <LocationRoleList
                value={locationRoles}
                onChange={(items) => {
                  setLocationRoles(items);
                  setLocationRolesTouched(true);
                }}
                companyId={companyId}
              />
            </View>
          </>
        )}
      </View>
    </AppForm>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
  wrapper: {
    width: "100%" as const,
    maxWidth: 640,
    alignSelf: "center" as const,
    paddingBottom: tokens.spacing[4],
  },
  photoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: tokens.spacing[4],
    padding: tokens.spacing[4],
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  photoBody: {
    flex: 1,
    minWidth: 0,
    gap: tokens.spacing[2],
  },
  photoLabel: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  photoButtons: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: tokens.spacing[2],
  },
  sectionTitle: {
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
    color: c.text,
    marginTop: tokens.spacing[6],
    marginBottom: tokens.spacing[1],
  },
  helper: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  passwordButton: {
    alignSelf: "flex-start" as const,
    marginBottom: tokens.spacing[2],
  },
  switchBox: {
    marginTop: tokens.spacing[2],
    padding: tokens.spacing[3],
    paddingTop: tokens.spacing[1],
    backgroundColor: c.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
});
