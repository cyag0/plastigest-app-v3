import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { isApiError, notifyError } from "@/utils/errorNotice";
import { objectToFormDataWithNestedInputsAsync } from "@/utils/formDataUtils";
import { goBack } from "@/utils/navigation";
import type { PermissionRule } from "@/utils/permissions/permissions";
import { CrudService } from "@/utils/services/crudService";
import { logCaughtError } from "@/utils/silenceLogs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FormikProps, FormikProvider, setNestedObjectValues, useFormik } from "formik";
import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { FORM_MAX_WIDTH, FormFooter } from "../FormLayout";

// Ref interface que expone todos los métodos
export interface AppFormRef<T> {
  // Formik methods
  submitForm: () => Promise<void>;
  resetForm: () => void;
  setValues: (values: T) => void;
  setFieldValue: (field: string, value: any) => void;
  setFieldTouched: (field: string, touched?: boolean) => void;
  validateForm: () => Promise<any>;
  validateField: (field: string) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setStatus: (status?: any) => void;
  setErrors: (errors: any) => void;
  setTouched: (touched: any) => void;

  // Form state getters
  getValues: () => T;
  getFieldValue: (field: string) => any;
  getErrors: () => any;
  getTouched: () => any;
  isValid: () => boolean;
  isDirty: () => boolean;
  isSubmitting: () => boolean;

  // Custom methods
  reload: () => Promise<void>;
  clear: () => void;

  // Formik instance access
  getFormikInstance: () => FormikProps<T>;
}

// Context interface
interface AppFormContextType<T> {
  readonly: boolean;
  formRef: React.RefObject<AppFormRef<T>> | null;
}

// Context
const AppFormContext = createContext<AppFormContextType<any> | null>(null);

interface FormProps<T> {
  formInstance?: FormikProps<T>;
  initialValues?: T | (() => T | Promise<T>) | (() => Promise<T>);
  id?: number | string;
  api?: CrudService<T>;
  validationSchema?: any;
  children?: React.ReactNode;
  onSubmit?: (values: T, formInstance: FormikProps<T>) => void | Promise<void>;
  onSuccess?: (response: any, values: T) => void;
  onError?: (error: any, values: T) => void;
  /** Texto de la acción principal; por omisión "Guardar" / "Guardar cambios". */
  submitButtonText?: string;
  additionalSubmitButtons?: React.ReactNode;
  resetButtonText?: string;
  showSubmitButton?: boolean;
  /** "Resetear" ya no se muestra salvo que se pida explícitamente. */
  showResetButton?: boolean;
  /** "Cancelar" (regresa); se puede ocultar o cambiar qué hace. */
  showCancelButton?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  /** Aviso al guardar con `api` ("Cliente guardado"). */
  successMessage?: string;
  /**
   * Confirmación antes de guardar con `api`. Por omisión no se pregunta: el
   * "¿Estás seguro de guardar los cambios?" de siempre solo agregaba un paso.
   */
  confirmMessage?: string;
  readonly?: boolean;
  showButtons?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disableScroll?: boolean;
  loading?: boolean;
  /** Envuelve los campos en una tarjeta (fondo, borde y sombra). */
  card?: boolean;
  /**
   * Permiso necesario para el botón "Eliminar" del modo solo lectura (p. ej.
   * "categories_delete"; varios = basta uno). Si el usuario no lo tiene, el
   * botón no se muestra. Sin este prop (ni permissionPrefix) el botón se
   * muestra y el backend decide (con confirmación).
   */
  deletePermission?: PermissionRule;
  /**
   * Permiso para guardar (opcional; varios = basta uno). Sin él no se
   * muestran "Crear/Actualizar", "Resetear", los botones extra ni "Editar
   * Registro", y en su lugar aparece "Solo lectura". Sin este prop (ni
   * permissionPrefix) se puede guardar como siempre.
   */
  submitPermission?: PermissionRule;
  /**
   * Recurso CRUD del formulario (p. ej. "categories"): deduce
   * submitPermission (<prefix>_update con id, <prefix>_create sin id) y
   * deletePermission (<prefix>_delete) cuando no se pasan.
   */
  permissionPrefix?: string;
  /** Oculta el botón "Eliminar" del modo solo lectura. */
  showDeleteButton?: boolean;
  /** Qué hacer tras eliminar en modo solo lectura (por defecto, regresar). */
  onDeleted?: () => void;
}

const AppForm = forwardRef<AppFormRef<any>, FormProps<any>>(function AppForm<
  T extends Record<string, any>,
>(props: FormProps<T>, ref: React.Ref<AppFormRef<T>>) {
  const [initialValues, setInitialValues] = useState<T>({} as T);
  const [loading, setLoading] = useState(props.loading || false);
  const formRef = useRef<AppFormRef<T>>(null);
  const [readonly, setReadonly] = useState(!!props.readonly);
  // El registro (id + api) no se pudo cargar: en lugar del formulario vacío
  // (con "Actualizar" activo o los datos en blanco) se explica por qué.
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);

  const alerts = useAlerts();
  const { colors } = useTheme();
  const { can } = useCan();
  // Candado contra envíos dobles (guardar y eliminar), ver handleSubmit.
  const { submitting, run } = useSubmitGuard();
  // En web la barra de abajo no necesita subir con el teclado.
  const isWeb = Platform.OS === "web";
  const styles = useThemedStyles((c) => ({
    formCard: {
      width: "100%",
      backgroundColor: c.surface,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: tokens.spacing[4],
    },
    cardWrap: {
      width: "100%",
      maxWidth: FORM_MAX_WIDTH,
      alignSelf: "center",
      backgroundColor: c.background
    },
    backgroundStyle: {
      backgroundColor: c.background,
    },
    readOnlyHint: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
    },
    readOnlyText: {
      color: c.textMuted,
    },
  }));

  // Permiso para guardar (submitPermission / permissionPrefix). Sin regla se
  // puede guardar, como antes.
  const submitRule =
    props.submitPermission ??
    (props.permissionPrefix
      ? `${props.permissionPrefix}_${props.id ? "update" : "create"}`
      : undefined);
  const canSubmit = can(submitRule);

  // Va antes de useFormik a propósito: este efecto corre antes que el
  // validateOnMount de Formik (después, la validación del formulario vacío
  // llegaba tarde y dejaba errores sobre los datos ya cargados).
  // loadInitialValues es una función declarada más abajo; en ejecución no
  // hay problema, la regla del React Compiler (apagado) no lo distingue.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    loadInitialValues();
  }, [props.id, props.initialValues]);

  const formik = useFormik({
    initialValues: initialValues,
    onSubmit: handleSubmit,
    validationSchema: props.validationSchema,
    enableReinitialize: true,
    validateOnMount: true,
  });

  // Si se pasa una instancia externa, la usamos
  const formInstance = props.formInstance || formik;

  // Expose methods through ref
  useImperativeHandle(
    ref,
    () => ({
      // Formik methods
      submitForm: () => formInstance.submitForm(),
      resetForm: () => formInstance.resetForm(),
      setValues: async (values: T) => {
        console.log("Setting form values:", values);
        await formInstance.setValues(values);
      },
      setFieldValue: (field: string, value: any) => {
        console.log("Setting field value:", field, value);
        formInstance.setFieldValue(field, value);
      },
      setFieldTouched: (field: string, touched?: boolean) =>
        formInstance.setFieldTouched(field, touched),
      validateForm: () => formInstance.validateForm(),
      validateField: (field: string) => formInstance.validateField(field),
      setSubmitting: (isSubmitting: boolean) =>
        formInstance.setSubmitting(isSubmitting),
      setStatus: (status?: any) => formInstance.setStatus(status),
      setErrors: (errors: any) => formInstance.setErrors(errors),
      setTouched: (touched: any) => formInstance.setTouched(touched),

      // Form state getters
      getValues: () => formInstance.values,
      getFieldValue: (field: string) => formInstance.getFieldProps(field).value,
      getErrors: () => formInstance.errors,
      getTouched: () => formInstance.touched,
      isValid: () => formInstance.isValid,
      isDirty: () => formInstance.dirty,
      isSubmitting: () => formInstance.isSubmitting,

      // Custom methods
      reload: loadInitialValues,
      clear: () => formInstance.setValues({} as T),

      // Formik instance access
      getFormikInstance: () => formInstance,
      setReadonly: (value: boolean) => setReadonly(value),
      readonly,
    }),
    [formInstance, loadInitialValues],
  );

  // Aplica los valores tanto al state que alimenta useFormik como al form.
  // Antes solo se hacía resetForm(), así que el `initialValues` de useFormik se
  // quedaba en {} para siempre: el primer render de CUALQUIER formulario tenía
  // values = {} y los hijos que indexan campos de tipo array (details, items…)
  // reventaban. Además resetForm() sin argumentos —el botón "Resetear"— volvía
  // a ese objeto vacío.
  function applyValues(values: T) {
    setInitialValues(values);
    formInstance.resetForm({ values });
  }

  async function loadInitialValues() {
    // ¿La carga es del registro por id? Su falla se muestra en la pantalla.
    const loadsRecord = Boolean(props.id && props.api) && typeof props.initialValues !== "function";
    try {
      setLoading(true);
      setLoadProblem(null);

      if (props.initialValues) {
        // Si initialValues es una función
        if (typeof props.initialValues === "function") {
          const result = await props.initialValues();
          applyValues(result);

          return;
        }
        // Si initialValues es un objeto
        else {
          const checkIdAndApi = Boolean(props.id && props.api);

          // Si hay ID y API, hacer petición automática
          if (checkIdAndApi) {
            // silent: si falla, RecordLoadError lo explica en la pantalla.
            //@ts-ignore
            const response = await props.api.show(props.id, undefined, { silent: true });
            const data = { ...props.initialValues, ...response.data.data };

            applyValues(data);
          } else {
            applyValues(props.initialValues as T);
          }

          return;
        }
      }
      // Si no hay initialValues pero hay ID y API
      else if (props.id && props.api) {
        const response = await props.api.show(props.id, undefined, { silent: true });
        applyValues(response.data.data as T);

        return;
      }
      // Si no hay nada, usar objeto vacío
      else {
        applyValues({} as T);
        return;
      }
    } catch (error) {
      logCaughtError("Error loading initial values:", error);
      if (loadsRecord) {
        setLoadProblem(recordLoadProblem(error, "No se pudieron cargar los datos del formulario."));
      } else {
        notifyError(error, "No se pudieron cargar los datos del formulario.");
      }
      props.onError?.(error, {} as T);
      formInstance.setValues({} as T);
    } finally {
      setLoading(false);
    }
  }

  // Un doble toque, un Enter repetido o un botón del header que llama a
  // submitForm dos veces llegan antes de que isSubmitting/loading
  // deshabiliten el botón: se mandaban dos altas iguales. Mientras un envío
  // sigue en curso (confirmación incluida), los demás se ignoran.
  function handleSubmit(_values: T) {
    // También cuando la pantalla llama submitForm() desde su propio botón.
    if (!canSubmit) {
      alerts.error("No tienes permiso para guardar estos cambios.");
      return;
    }
    return run(() => submitValues(_values));
  }

  async function submitValues(_values: T) {
    try {
      setLoading(true);

      const values = (await objectToFormDataWithNestedInputsAsync(
        _values,
      )) as any;

      // Si se pasa handleSubmit personalizado, usarlo
      if (props.onSubmit) {
        await props.onSubmit(values as T, formInstance);
      }
      // Si no hay handleSubmit pero hay API, usar store automático
      else if (props.api) {
        if (props.confirmMessage) {
          const res = await alerts.confirm(props.confirmMessage, {
            okText: "Sí, guardar",
            cancelText: "Cancelar",
            title: "Confirmar",
          });
          if (!res) {
            return;
          }
        }

        let response;

        // Si hay ID, es actualización
        if (props.id) {
          response = await props.api.update(props.id, values as T);
        }
        // Si no hay ID, es creación
        else {
          response = await props.api.store(values as T);
        }
        alerts.success(props.successMessage ?? (props.id ? "Cambios guardados" : "Guardado"));

        props.onSuccess?.(response.data, _values);
      }
    } catch (error: any) {
      logCaughtError("Error submitting form:", error);
      // Mensaje del servidor; en un 422 con el primer error de campo (sin él
      // el usuario no sabe qué corregir). Un error propio de onSubmit
      // (throw new Error("…")) muestra su texto.
      notifyError(
        error,
        (!isApiError(error) && error?.message) || "No se pudo guardar.",
      );
      props.onError?.(error, _values);
    } finally {
      setLoading(false);
    }
  }

  // Función helper para detectar si hay archivos en los valores
  function hasFiles(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;

    for (const key in obj) {
      const value = obj[key];

      // Verificar si es un archivo individual
      if (value && typeof value === "object" && value.uri) {
        return true;
      }

      // Verificar si es un array de archivos
      if (Array.isArray(value) && value.length > 0) {
        if (
          value.some((item) => item && typeof item === "object" && item.uri)
        ) {
          return true;
        }
      }

      // Verificar recursivamente en objetos anidados
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        if (hasFiles(value)) {
          return true;
        }
      }
    }

    return false;
  }

  // Guardar con datos faltantes ya no deja el botón gris sin explicación:
  // se marcan en rojo los campos (también los que no estaban en los valores
  // iniciales, que Formik no toca solo) y la barra de abajo dice qué pasa.
  const [invalidAttempt, setInvalidAttempt] = useState(false);
  const showInvalid = invalidAttempt && !formInstance.isValid;

  async function attemptSubmit() {
    const errors = await formInstance.validateForm();
    if (errors && Object.keys(errors).length > 0) {
      formInstance.setTouched(
        { ...formInstance.touched, ...setNestedObjectValues(errors, true) } as any,
        false,
      );
      setInvalidAttempt(true);
      return;
    }
    setInvalidAttempt(false);
    formInstance.handleSubmit();
  }

  // Context value. Sin permiso para guardar (submitPermission /
  // permissionPrefix) los campos también quedan en solo lectura: antes se
  // podía escribir en un formulario marcado «Solo lectura».
  const contextValue: AppFormContextType<T> = {
    readonly: readonly || !canSubmit,
    formRef: { current: ref as any },
  };

  const showButtons =
    props.showButtons === undefined ? true : props.showButtons;

  // "Eliminar" del modo solo lectura: solo con registro y API, y si se indicó
  // el permiso, solo cuando el usuario lo tiene.
  const deleteRule =
    props.deletePermission ??
    (props.permissionPrefix ? `${props.permissionPrefix}_delete` : undefined);
  const canDelete =
    props.showDeleteButton !== false &&
    Boolean(props.id && props.api) &&
    can(deleteRule);

  // "Solo lectura": en lugar de los botones de guardar cuando falta el permiso.
  const readOnlyHint = (
    <View style={styles.readOnlyHint}>
      <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textMuted} />
      <Text variant="bodySmall" style={styles.readOnlyText}>
        Solo lectura
      </Text>
    </View>
  );

  function handleDelete() {
    return run(deleteRecord);
  }

  async function deleteRecord() {
    if (!props.id || !props.api) return;

    const confirmed = await alerts.confirm(
      "¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer.",
      {
        title: "Eliminar registro",
        okText: "Eliminar",
        cancelText: "Cancelar",
      },
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await props.api.destroy(props.id);
      alerts.success("Registro eliminado");
      if (props.onDeleted) {
        props.onDeleted();
      } else {
        goBack();
      }
    } catch (error: any) {
      logCaughtError("Error deleting record:", error);
      notifyError(error, "No se pudo eliminar el registro.");
    } finally {
      setLoading(false);
    }
  }

  // Barra fija de abajo (ver FormFooter): Cancelar y la acción principal, o
  // Eliminar y Editar en modo solo lectura. Antes en web eran botones chicos
  // al final del formulario y en el teléfono se apilaban a todo lo ancho.
  const renderButtons = () => {
    if (!showButtons) return null;

    let footer: React.ReactNode = null;
    if (readonly) {
      if (!canSubmit && !canDelete) {
        footer = <FormFooter>{readOnlyHint}</FormFooter>;
      } else {
        footer = (
          <FormFooter>
            {canDelete && (
              <Button
                mode="outlined"
                onPress={handleDelete}
                disabled={formInstance.isSubmitting || loading || submitting}
                textColor={colors.error}
                loading={loading}
                style={{ flex: 1 }}
              >
                Eliminar
              </Button>
            )}
            {canSubmit ? (
              <Button
                mode="contained"
                icon="pencil-outline"
                onPress={() => setReadonly(false)}
                style={{ flex: 1.4 }}
              >
                Editar
              </Button>
            ) : (
              readOnlyHint
            )}
          </FormFooter>
        );
      }
    } else if (!canSubmit) {
      footer = <FormFooter>{readOnlyHint}</FormFooter>;
    } else if (
      props.showSubmitButton !== false ||
      props.showResetButton === true ||
      props.additionalSubmitButtons
    ) {
      footer = (
        <FormFooter
          note={showInvalid ? "Falta completar o corregir los campos marcados." : undefined}
        >
          {props.showCancelButton !== false && (
            <Button
              mode="outlined"
              onPress={props.onCancel ?? (() => goBack())}
              disabled={loading || submitting}
              style={{ flex: 1 }}
            >
              {props.cancelLabel ?? "Cancelar"}
            </Button>
          )}

          {props.showResetButton === true && (
            <Button
              mode="outlined"
              onPress={() => formInstance.resetForm()}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {props.resetButtonText || "Deshacer cambios"}
            </Button>
          )}

          {props.additionalSubmitButtons && props.additionalSubmitButtons}

          {props.showSubmitButton !== false && (
            <Button
              mode="contained"
              onPress={attemptSubmit}
              disabled={formInstance.isSubmitting || loading || submitting}
              loading={loading}
              style={{ flex: 1.4 }}
            >
              {props.submitButtonText || (props.id ? "Guardar cambios" : "Guardar")}
            </Button>
          )}
        </FormFooter>
      );
    }

    if (!footer) return null;

    // En el teléfono la barra sube con el teclado. En web no es necesario.
    if (isWeb) return footer;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        {footer}
      </KeyboardAvoidingView>
    );
  };

  if (loadProblem) {
    return <RecordLoadError problem={loadProblem} onRetry={loadInitialValues} />;
  }

  return (
    <AppFormContext.Provider value={contextValue}>
      <FormikProvider value={formInstance}>
        <View style={[{ flex: 1, backgroundColor: styles.backgroundStyle.backgroundColor, 
            
         }, props.containerStyle]}>
          <ScrollView
            scrollEnabled={!props.disableScroll}
            // Con el teclado abierto, el primer toque en un botón o select
            // ejecuta la acción en vez de solo cerrar el teclado.
            keyboardShouldPersistTaps="handled"
            // iOS: desplaza el campo enfocado por encima del teclado en
            // formularios largos (Android ajusta la ventana; web lo ignora).
            automaticallyAdjustKeyboardInsets
            style={[{ padding: 16,
              backgroundColor: styles.backgroundStyle.backgroundColor,
            }, props.style]}
            contentContainerStyle={[
              props.containerStyle,
              styles.cardWrap,
            ]}
          >
            {props.card ? (
              <View style={styles.formCard}>{props.children}</View>
            ) : (
              props.children
            )}
            <View style={{ height: props.disableScroll ? 0 : 24 }} />
          </ScrollView>

          {renderButtons()}
        </View>
      </FormikProvider>
    </AppFormContext.Provider>
  );
});

// Hook personalizado para usar el formulario
export function useAppForm<T = any>() {
  const context = useContext(AppFormContext);

  if (!context) {
    throw new Error("useAppForm must be used within an AppForm component");
  }

  const { readonly = false, formRef } = context;

  // Métodos del formulario
  const methods = {
    // State getters
    get readonly() {
      return readonly;
    },

    get ref() {
      return formRef?.current;
    },

    // Formik methods (safe wrappers)
    submitForm: () => {
      return formRef?.current?.submitForm();
    },

    resetForm: () => {
      return formRef?.current?.resetForm();
    },

    setValues: (values: T) => {
      return formRef?.current?.setValues(values);
    },

    setFieldValue: (field: string, value: any) => {
      return formRef?.current?.setFieldValue(field, value);
    },

    setFieldTouched: (field: string, touched?: boolean) => {
      return formRef?.current?.setFieldTouched(field, touched);
    },

    validateForm: () => {
      return formRef?.current?.validateForm();
    },

    validateField: (field: string) => {
      return formRef?.current?.validateField(field);
    },

    setSubmitting: (isSubmitting: boolean) => {
      return formRef?.current?.setSubmitting(isSubmitting);
    },

    setStatus: (status?: any) => {
      return formRef?.current?.setStatus(status);
    },

    setErrors: (errors: any) => {
      return formRef?.current?.setErrors(errors);
    },

    setTouched: (touched: any) => {
      return formRef?.current?.setTouched(touched);
    },

    // State getters
    getValues: (): T | undefined => {
      return formRef?.current?.getValues();
    },

    getFieldValue: (field: string) => {
      return formRef?.current?.getFieldValue(field);
    },

    getErrors: () => {
      return formRef?.current?.getErrors();
    },

    getTouched: () => {
      return formRef?.current?.getTouched();
    },

    isValid: (): boolean => {
      return formRef?.current?.isValid() || false;
    },

    isDirty: (): boolean => {
      return formRef?.current?.isDirty() || false;
    },

    isSubmitting: (): boolean => {
      return formRef?.current?.isSubmitting() || false;
    },

    // Custom methods
    reload: () => {
      return formRef?.current?.reload();
    },

    clear: () => {
      return formRef?.current?.clear();
    },

    getFormikInstance: () => {
      return formRef?.current?.getFormikInstance();
    },
  };

  return methods;
}

export default AppForm;
