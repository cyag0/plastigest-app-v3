import RolePicker from "@/components/Administration/Users/RolePicker";
import UserAvatar from "@/components/Administration/Users/UserAvatar";
import {
  AdminUser,
  UserFormValues,
  buildUserPayload,
  canManageUser,
  isProtectedUser,
} from "@/components/Administration/Users/userAccess";
import { UserScope, shortLocationName } from "@/components/Administration/Users/userDisplay";
import { useCompanyRoles } from "@/components/Administration/Users/useCompanyRoles";
import { useUserScope } from "@/components/Administration/Users/useUserScope";
import EmptyState from "@/components/App/EmptyState";
import { ListGroup, ListRow } from "@/components/App/ListGroup";
import RecordLoadError, { recordLoadProblem, type RecordLoadProblem } from "@/components/App/RecordLoadError";
import FormNote from "@/components/Auth/FormNote";
import AppDependency from "@/components/Form/AppDependency";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import MakeForm, { InputLabel } from "@/components/Form/AppForm/hoc";
import ReadonlyText from "@/components/Form/AppForm/ReadonlyText";
import { FormInput } from "@/components/Form/AppInput";
import { FormSwitch } from "@/components/Form/AppSwitch";
import { FormSection } from "@/components/Form/FormLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { objectToFormDataWithNestedInputsAsync } from "@/utils/formDataUtils";
import { goBack } from "@/utils/navigation";
import axiosClient from "@/utils/axios";
import Services from "@/utils/services";
import { useNavigation } from "expo-router";
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
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

/** Lo que cabe en la tabla users (name y email son string de 255). */
const MAX_LENGTH = 255;

/** Sucursal y rol de cada acceso, para saber si cambiaron. */
function accessKey(items: { location_id?: number | string | null; role_id?: number | string | null }[]) {
  return items
    .filter((item) => item.location_id)
    .map((item) => `${item.location_id}:${item.role_id ?? ""}`)
    .sort()
    .join(",");
}

/**
 * Alta y edición de usuarios: foto chica al lado, nombre, correo (con el que
 * entra) y contraseña; luego su acceso (el rol en la sucursal o las sucursales
 * y roles en la empresa) y, al editar, si está activo.
 *
 * Solo ofrece lo que quien edita puede cambiar (el backend rechaza lo demás
 * con 403): a un administrador del sistema solo lo edita otro, y nadie se
 * desactiva ni se cambia el rol a sí mismo desde aquí. Guardar ya no pregunta
 * «¿Estás seguro?» cada vez: solo cuando cambias tus propias sucursales.
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
  // No se pudo abrir (404: no existe o no hay acceso a él; 403; red): se
  // explica en lugar del formulario, como en los demás registros.
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);
  const { roleIds } = useCompanyRoles(isEditing);

  const branch = shortLocationName(location?.name ?? "esta sucursal", selectedCompany?.name);
  const isSelf = isEditing && me?.id === id;
  const locked =
    isEditing && !!target && !hasPermission("system_admin") && isProtectedUser(target, roleIds, selectedCompany?.id);
  // Tiene permisos que quien edita no tiene (can_manage: false): solo nombre y
  // foto; correo, contraseña, estado, rol y sucursales los rechazaría el
  // servidor con 403.
  const restricted = isEditing && !!target && !locked && !canManageUser(target);
  const canChangeActive = isEditing && !isSelf && !locked && !restricted;
  const canChangeRole = isBranch && !isSelf && !locked && !restricted;

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditing ? "Editar usuario" : "Nuevo usuario" });
  }, [navigation, isEditing]);

  // La contraseña es obligatoria al crear; al editar solo se revisa si se
  // escribió una nueva.
  const validationSchema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().trim().required("Escribe su nombre").max(MAX_LENGTH, `Máximo ${MAX_LENGTH} caracteres`),
        email: Yup.string()
          .trim()
          .required("Escribe su correo: con él entra a la app")
          .email("Revisa el correo; parece incompleto")
          .max(MAX_LENGTH, `Máximo ${MAX_LENGTH} caracteres`),
        password: isEditing
          ? Yup.string().test("password-edit", "Debe tener al menos 8 caracteres", (v) => !v || v.length >= 8)
          : Yup.string().required("Escribe una contraseña").min(8, "Debe tener al menos 8 caracteres"),
        ...(canChangeRole
          ? {
              location_role_id: Yup.number()
                .required("Elige su rol en esta sucursal")
                .typeError("Elige su rol en esta sucursal"),
            }
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
      // silent: si falla, el motivo se muestra en la pantalla (loadProblem).
      response = await axiosClient.get(`/auth/admin/users/${id}`, { silent: true });
    } catch (error) {
      initialRef.current = null;
      setLoadProblem(recordLoadProblem(error, "No se pudo cargar el usuario."));
      return empty;
    }
    const user: AdminUser = response?.data?.data ?? response?.data ?? {};
    setLoadProblem(null);
    setTarget(user);

    if (!isBranch) {
      setLocationRoles(
        (user.location_roles ?? []).map((lr) => ({
          location_id: lr.location_id,
          role_id: lr.role_id ?? undefined,
          location_name: lr.location_name,
          role_name: lr.role_name,
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
    const sendLocationRoles = !isBranch && !restricted && locationRolesTouched;
    const payload = buildUserPayload({
      values,
      initial: isEditing ? initialRef.current : null,
      branchMode: isBranch,
      canChangePassword: !locked && !restricted,
      canChangeActive,
      canChangeRole,
      locationRoles: sendLocationRoles ? locationRoles : null,
    });

    // Antes se preguntaba «¿Estás seguro?» en cada guardado. Solo hace falta
    // cuando cambias tu propio acceso: puedes quedarte sin esta pantalla.
    if (
      isSelf &&
      sendLocationRoles &&
      accessKey(locationRoles) !== accessKey(target?.location_roles ?? [])
    ) {
      const confirmed = await alerts.confirm(
        "Cambiaste tus propias sucursales o roles. Si te quitas esta sucursal o tu rol cambia, puedes perder el acceso a esta pantalla.",
        { title: "¿Guardar tu acceso?", okText: "Guardar", cancelText: "Revisar" },
      );
      if (!confirmed) return;
    }

    const body = (await objectToFormDataWithNestedInputsAsync(payload)) as any;
    if (id) {
      await Services.admin.users.update(id, body);
      alerts.success("Cambios guardados");
    } else {
      await Services.admin.users.store(body);
      alerts.success("Usuario creado");
    }
    goBack();
  };

  const accessSection = restricted ? null : isBranch ? (
    <FormSection
      title={`Rol en ${branch}`}
      description={
        canChangeRole
          ? isEditing
            ? "Solo cambia su rol en esta sucursal; sus otras sucursales no se tocan."
            : "Entra a esta sucursal con el rol que elijas."
          : undefined
      }
    >
      {canChangeRole ? (
        <FormRolePicker name="location_role_id" />
      ) : (
        <ListGroup>
          <ListRow
            icon="shield-account-outline"
            title={target?.location_role?.role_name ?? "Sin rol"}
            subtitle="Tu propio rol lo cambia otra persona con permiso para editar usuarios."
            chevron={false}
          />
        </ListGroup>
      )}
    </FormSection>
  ) : (
    <FormSection
      title="Sucursales y roles"
      description={isSelf ? undefined : "A qué sucursales entra y con qué rol en cada una."}
    >
      {isSelf && (
        <View style={styles.note}>
          <FormNote tone="warning">
            Es tu propio usuario: si te quitas una sucursal o cambias tu rol, puedes perder el acceso.
          </FormNote>
        </View>
      )}
      <LocationRoleList
        value={locationRoles}
        onChange={(items) => {
          setLocationRoles(items);
          setLocationRolesTouched(true);
        }}
        companyId={companyId}
      />
    </FormSection>
  );

  if (loadProblem) {
    return (
      <RecordLoadError
        problem={loadProblem}
        notFoundTitle="No se encontró el usuario"
        notFoundDescription="No existe o no tienes acceso a él."
        errorTitle="No se pudo cargar el usuario"
        // Vuelve a montar el formulario, que lo pide de nuevo.
        onRetry={() => setLoadProblem(null)}
      />
    );
  }

  // A un administrador del sistema solo lo edita otro: se explica en lugar
  // del formulario.
  if (locked) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="shield-lock-outline"
          title={`${target?.name ?? "Este usuario"} es administrador del sistema`}
          description="Solo otro administrador del sistema puede cambiar sus datos, su contraseña, su acceso o sus roles."
          actionLabel="Volver"
          onAction={() => goBack()}
        />
      </View>
    );
  }

  return (
    <AppForm
      ref={formRef}
      api={Services.admin.users}
      id={id}
      // Guardar pide users_update al editar y users_create al crear.
      permissionPrefix="users"
      validationSchema={validationSchema}
      initialValues={loadInitialValues}
      submitButtonText={isEditing ? "Guardar cambios" : "Crear usuario"}
      onSubmit={(_formData, formik) => submit(formik.values as UserFormData)}
    >
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
          <InputLabel label="Foto" optional />
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

      {restricted && (
        <View style={styles.note}>
          <FormNote icon="shield-lock-outline">
            {target?.name} tiene permisos que tú no tienes: puedes cambiar su nombre y su foto; su correo,
            contraseña, estado, rol y sucursales los cambia alguien con esos permisos.
          </FormNote>
        </View>
      )}

      {/* autoComplete off / new-password: son los datos de otra persona; el
          navegador no debe llenarlos con los de quien está dando de alta. */}
      <FormInput
        name="name"
        label="Nombre"
        placeholder="Ana López"
        autoCapitalize="words"
        autoComplete="off"
        maxLength={MAX_LENGTH}
      />
      {restricted ? (
        // Sin permiso para cambiarlo se lee como dato, no como un campo
        // deshabilitado que se ve igual a los demás.
        <View style={styles.fieldBlock}>
          <InputLabel label="Correo electrónico" />
          <ReadonlyText text={target?.email ?? ""} />
        </View>
      ) : (
        <FormInput
          name="email"
          label="Correo electrónico"
          placeholder="ana@cocosfrancisco.mx"
          hint="Con este correo entra a la app."
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          maxLength={MAX_LENGTH}
        />
      )}

      {restricted ? null : showPasswordField ? (
        <FormInput
          name="password"
          label={isEditing ? "Nueva contraseña" : "Contraseña"}
          hint={
            isEditing
              ? "Al menos 8 caracteres. Al guardarla se cierran sus sesiones abiertas."
              : "Al menos 8 caracteres. Después la puede cambiar en su perfil."
          }
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="new-password"
          textContentType="newPassword"
          right={
            <TextInput.Icon
              icon={passwordVisible ? "eye-off-outline" : "eye-outline"}
              color={colors.textMuted}
              onPress={() => setPasswordVisible((v) => !v)}
              forceTextInputFocus={false}
              accessibilityLabel={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
            />
          }
        />
      ) : (
        <View style={styles.fieldBlock}>
          <InputLabel label="Contraseña" />
          <Button
            mode="outlined"
            icon="lock-reset"
            onPress={() => setShowPasswordField(true)}
            style={styles.passwordButton}
          >
            Cambiar contraseña
          </Button>
        </View>
      )}

      {accessSection}

      {canChangeActive && (
        <FormSwitch
          name="is_active"
          text="Activo"
          description="Si lo desactivas, no puede entrar a la app y se cierran sus sesiones."
        />
      )}
    </AppForm>
  );
}

const makeStyles = themedStyles((c) => ({
  centered: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: c.background,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 22,
  },
  photoBody: {
    flex: 1,
    minWidth: 0,
  },
  photoButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  note: {
    marginBottom: 18,
  },
  // Lo que va en lugar de un campo (la contraseña sin cambiar, el correo que
  // no se puede cambiar): con el mismo espacio abajo que los campos.
  fieldBlock: {
    marginBottom: 18,
  },
  passwordButton: {
    alignSelf: "flex-start",
  },
}));
