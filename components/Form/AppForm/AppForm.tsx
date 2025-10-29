import palette from "@/constants/palette";
import { objectToFormDataWithNestedInputsAsync } from "@/utils/formDataUtils";
import { CrudService } from "@/utils/services/crudService";
import { FormikProps, FormikProvider, useFormik } from "formik";
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
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Button } from "react-native-paper";

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
  submitButtonText?: string;
  additionalSubmitButtons?: React.ReactNode;
  resetButtonText?: string;
  showSubmitButton?: boolean;
  showResetButton?: boolean;
  readonly?: boolean;
  showButtons?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disableScroll?: boolean;
}

const AppForm = forwardRef<AppFormRef<any>, FormProps<any>>(function AppForm<
  T extends Record<string, any>
>(props: FormProps<T>, ref: React.Ref<AppFormRef<T>>) {
  const [initialValues, setInitialValues] = useState<T>({} as T);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<AppFormRef<T>>(null);
  const [readonly, setReadonly] = useState(!!props.readonly);

  useEffect(() => {
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
      setValues: (values: T) => formInstance.setValues(values),
      setFieldValue: (field: string, value: any) =>
        formInstance.setFieldValue(field, value),
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
    [formInstance, loadInitialValues]
  );

  async function loadInitialValues() {
    try {
      setLoading(true);

      if (props.initialValues) {
        // Si initialValues es una función
        if (typeof props.initialValues === "function") {
          const result = await props.initialValues();
          formInstance.setValues(result);
        }
        // Si initialValues es un objeto
        else {
          // Si hay ID y API, hacer petición automática
          if (props.id && props.api) {
            const response = await props.api.show(props.id);
            formInstance.setValues(response.data.data);
          } else {
            formInstance.setValues(props.initialValues);
          }
        }
      }
      // Si no hay initialValues pero hay ID y API
      else if (props.id && props.api) {
        const response = await props.api.show(props.id);
        formInstance.setValues(response.data.data);
      }
      // Si no hay nada, usar objeto vacío
      else {
        formInstance.setValues({} as T);
      }
    } catch (error) {
      console.error("Error loading initial values:", error);
      props.onError?.(error, {} as T);
      formInstance.setValues({} as T);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(_values: T) {
    try {
      setLoading(true);

      console.log("values", _values);

      const values = (await objectToFormDataWithNestedInputsAsync(
        _values
      )) as any;

      console.log("formdata ", values);

      // Si se pasa handleSubmit personalizado, usarlo
      if (props.onSubmit) {
        await props.onSubmit(values as T, formInstance);
      }
      // Si no hay handleSubmit pero hay API, usar store automático
      else if (props.api) {
        let response;

        // Si hay ID, es actualización
        if (props.id) {
          response = await props.api.update(props.id, values as T);
        }
        // Si no hay ID, es creación
        else {
          response = await props.api.store(values as T);
        }

        props.onSuccess?.(response.data, _values);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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

  // Context value
  const contextValue: AppFormContextType<T> = {
    readonly: readonly || false,
    formRef: { current: ref as any },
  };

  return (
    <AppFormContext.Provider value={contextValue}>
      <FormikProvider value={formInstance}>
        <View style={{ flex: 1 }}>
          <ScrollView
            scrollEnabled={!props.disableScroll}
            style={[{ padding: 16 }, props.style]}
            contentContainerStyle={props.containerStyle}
          >
            {props.children}
          </ScrollView>

          {props.showButtons !== undefined ||
            (!props.showButtons && (
              <KeyboardAvoidingView
                behavior="padding"
                keyboardVerticalOffset={100}
              >
                {readonly ? (
                  <>
                    <View style={{ padding: 16 }}>
                      <View style={{ gap: 8 }}>
                        <View>
                          <Button
                            mode="contained"
                            onPress={() => {
                              setReadonly(false);
                            }}
                          >
                            Editar Registro
                          </Button>
                        </View>

                        <View>
                          <Button
                            mode="outlined"
                            onPress={async () => {
                              if (props.id && props.api) {
                                try {
                                  setLoading(true);
                                  await props.api.destroy(props.id);
                                  formInstance.resetForm();
                                } catch (error) {
                                  console.error(
                                    "Error deleting record:",
                                    error
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            theme={{ colors: { primary: "#fff" } }}
                            disabled={
                              !formInstance.isValid ||
                              formInstance.isSubmitting ||
                              loading
                            }
                            textColor={palette.red}
                            loading={loading}
                          >
                            Eliminar
                          </Button>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  (props.showSubmitButton !== false ||
                    props.showResetButton !== false) && (
                    <View style={{ padding: 16 }}>
                      <View style={{ gap: 8 }}>
                        {props.showSubmitButton !== false && (
                          <View>
                            <Button
                              mode="contained"
                              onPress={() => formInstance.handleSubmit()}
                              disabled={
                                !formInstance.isValid ||
                                formInstance.isSubmitting ||
                                loading
                              }
                              loading={loading}
                            >
                              {props.submitButtonText ||
                                (props.id ? "Actualizar" : "Crear")}
                            </Button>
                          </View>
                        )}

                        {props.showResetButton !== false && (
                          <View>
                            <Button
                              mode="outlined"
                              onPress={() => formInstance.resetForm()}
                              disabled={loading}
                            >
                              {props.resetButtonText || "Resetear"}
                            </Button>
                          </View>
                        )}

                        {props.additionalSubmitButtons && (
                          props.additionalSubmitButtons
                        )}
                      </View>
                    </View>
                  )
                )}
              </KeyboardAvoidingView>
            ))}
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
