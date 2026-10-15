import RolePicker from "@/components/Administration/Users/RolePicker";
import UserAvatar from "@/components/Administration/Users/UserAvatar";
import {
  AdminUser,
  UserFormValues,
  buildUserPayload,
  isProtectedUser,
} from "@/components/Administration/Users/userAccess";
import { UserScope, apiMessage, shortLocationName } from "@/components/Administration/Users/userDisplay";
import { useCompanyRoles } from "@/components/Administration/Users/useCompanyRoles";
import { useUserScope } from "@/components/Administration/Users/useUserScope";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import MakeForm from "@/components/Form/AppForm/hoc";
import { FormInput } from "@/components/Form/AppInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { objectToFormDataWithNestedInputsAsync } from "@/utils/formDataUtils";
import { goBack } from "@/utils/navigation";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button, TextInput } from "react-native-paper";
import * as Yup from "yup";
import LocationRoleList, { LocationRoleItem } from "../Administration/CompanyAssignmentWidget";
import { FormUpload } from "../Form/AppUpload";

type UserFormData = UserFormValues;

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
 *
 * Solo ofrece lo que quien edita puede cambiar (el backend rechaza lo demás
 * con 403): a un administrador del sistema solo lo edita otro, y nadie se
 * desactiva ni se cambia el rol a sí mismo desde aquí.
 */
export default function UserFormShared(props: UserFormSharedProps) {
  const { id, companyId } = props;
  const mode = useUserScope(props.mode ?? "global");
  const isEditing = !!id;
  const isBranch = mode === "location";
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { location, selectedCompany, user: me, hasPermission } = useAuth();
  const formRef = useRef<AppFormRef<UserFormData>>(null);
  const [showPasswordField, setShowPasswordField] = useState(!isEditing);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [locationRoles, setLocationRoles] = useState<LocationRoleItem[]>([]);
  // Se envían solo si se tocaron: así quitar todas las sucursales sí se
  // guarda, y una carga fallida no borra las que ya tenía.
  const [locationRolesTouched, setLocationRolesTouched] = useState(false);
  // El usuario como llegó y lo que tenía al abrir (para mandar solo lo que
  // cambió).
  const [target, setTarget] = useState<AdminUser | null>(null);
  const initialRef = useRef<UserFormData | null>(null);
  // No se pudo abrir (403/404: no existe o no hay acceso a él).
  const [loadError, setLoadError] = useState<string | null>(null);
  const { roleIds } = useCompanyRoles(isEditing);

  const branch = shortLocationName(location?.name ?? "esta sucursal", selectedCompany?.name);
  const isSelf = isEditing && me?.id === id;
  const locked =
    isEditing && !!target && !hasPermission("system_admin") && isProtectedUser(target, roleIds, selectedCompany?.id);
  const canChangeActive = isEditing && !isSelf && !locked;
  const canChangeRole = isBranch && !isSelf && !locked;

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
        ...(canChangeRole
          ? { location_role_id: Yup.number().required("Elige su rol en esta sucursal").typeError("Elige su rol en esta sucursal") }
          : {}),
      }),
    [isEditing, canChangeRole],
  );

  // Solo los campos que se editan aquí: el detalle trae además sus
  // sucursales, empresas y roles, que no deben reenviarse con el formulario
  // (en la sucursal, reenviar todas las sucursales ni siquiera está permitido).
  const loadInitialValues = useCallback(async (): Promise<UserFormData> => {
    const empty: UserFormData = { name: "", email: "", password: "", is_active: true, avatar: [] };
    if (!id) {
      initialRef.current = null;
      return empty;
    }

    let response: any;
    try {
      response = await Services.admin.users.show(id);
    } catch (error: any) {
      initialRef.current = null;
      setLoadError(
        error?.response?.status === 404
          ? "Este usuario no existe o no tienes acceso a él."
          : apiMessage(error, "No se pudo cargar el usuario."),
      );
      return empty;
    }
    const user: AdminUser = response?.data?.data ?? response?.data ?? {};
    setLoadError(null);
    setTarget(user);

    if (!isBranch) {
      setLocationRoles(
        (user.location_roles ?? []).map((lr) => ({
          location_id: lr.location_id,
          role_id: lr.role_id ?? undefined,
        })),
      );
    }

    const initial: UserFormData = {
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      is_active: user.is_active ?? true,
      avatar: user.avatar ?? [],
      ...(isBranch ? { location_role_id: user.location_role?.role_id ?? undefined } : {}),
    };
    initialRef.current = initial;
    return initial;
  }, [id, isBranch]);

  // Guarda en una sola petición lo que cambió (ver buildUserPayload). Los
  // errores (403, 422) los muestra AppForm con el mensaje del backend.
  const submit = async (values: UserFormData) => {
    // Sin lo que tenía al abrir no se sabe qué cambió (y no es un alta).
    if (isEditing && !initialRef.current) {
      alerts.error("No se cargó el usuario; vuelve a abrir el formulario.");
      return;
    }
    const payload = buildUserPayload({
      values,
      initial: isEditing ? initialRef.current : null,
      branchMode: isBranch,
      canChangePassword: !locked,
      canChangeActive,
      canChangeRole,
      locationRoles: !isBranch && locationRolesTouched ? locationRoles : null,
    });

    const confirmed = await alerts.confirm("¿Estás seguro de guardar los cambios?", {
      okText: "Sí, guardar",
      cancelText: "Cancelar",
      title: "Confirmar guardado",
    });
    if (!confirmed) return;

    const body = (await objectToFormDataWithNestedInputsAsync(payload)) as any;
    if (id) {
      await Services.admin.users.update(id, body);
      alerts.success("Actualizado correctamente");
    } else {
      await Services.admin.users.store(body);
      alerts.success("Creado correctamente");
    }
    goBack();
  };

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.users}
      id={id}
      validationSchema={validationSchema}
      initialValues={loadInitialValues}
      showResetButton={false}
      showButtons={!locked && !loadError}
      submitButtonText={isEditing ? "Guardar cambios" : "Crear usuario"}
      onSubmit={(_formData, formik) => submit(formik.values as UserFormData)}
    >
      {loadError ? (
        <View style={styles.wrapper}>
          <View style={styles.lockedBox}>
            <MaterialCommunityIcons name="account-question-outline" size={22} color={colors.textSecondary} />
            <Text style={[styles.helper, { flex: 1 }]}>{loadError}</Text>
          </View>
          <Button mode="outlined" icon="arrow-left" onPress={() => goBack()} style={styles.lockedBack}>
            Volver
          </Button>
        </View>
      ) : locked ? (
        <View style={styles.wrapper}>
          <View style={styles.lockedBox}>
            <MaterialCommunityIcons name="shield-lock-outline" size={22} color={colors.info} />
            <View style={styles.photoBody}>
              <Text style={styles.lockedTitle}>{target?.name} es administrador del sistema</Text>
              <Text style={styles.helper}>
                Solo otro administrador del sistema puede cambiar sus datos, su contraseña, su acceso o
                sus roles.
              </Text>
            </View>
          </View>
          <Button mode="outlined" icon="arrow-left" onPress={() => goBack()} style={styles.lockedBack}>
            Volver
          </Button>
        </View>
      ) : (
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

          {canChangeActive && (
            <View style={styles.switchBox}>
              <FormSwitch name="is_active" text="Usuario activo" />
              <Text style={styles.helper}>Si lo desactivas no puede entrar a la app y se cierran sus sesiones.</Text>
            </View>
          )}

          {/* Acceso */}
          {isBranch ? (
            <>
              <Text style={styles.sectionTitle}>Rol en {branch}</Text>
              {canChangeRole ? (
                <>
                  <Text style={styles.helper}>
                    {isEditing
                      ? "Solo cambia su rol en esta sucursal; sus otras sucursales no se tocan."
                      : "Queda con acceso a esta sucursal con el rol que elijas."}
                  </Text>
                  <FormRolePicker name="location_role_id" containerStyle={{ marginTop: tokens.spacing[3] }} />
                </>
              ) : (
                <Text style={styles.helper}>
                  {target?.location_role?.role_name ?? "Sin rol"}. Tu propio rol lo cambia otra persona con
                  permiso para editar usuarios.
                </Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Sucursales y roles</Text>
              <Text style={styles.helper}>
                {isSelf
                  ? "Es tu propio usuario: si te quitas una sucursal o cambias tu rol puedes perder el acceso."
                  : "Las sucursales a las que puede entrar y su rol en cada una."}
              </Text>
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
      )}
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
  lockedBox: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: tokens.spacing[3],
    padding: tokens.spacing[4],
    backgroundColor: c.infoSoft,
    borderRadius: tokens.radius.md,
  },
  lockedTitle: {
    ...tokens.typography.bodyMd,
    fontWeight: "700" as const,
    color: c.text,
  },
  lockedBack: {
    alignSelf: "flex-start" as const,
    marginTop: tokens.spacing[4],
  },
});
