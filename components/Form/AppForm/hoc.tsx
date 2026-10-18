import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { FastField, FieldConfig, getIn } from "formik";
import React, { isValidElement, useRef } from "react";
import { type HostInstance, Text, View } from "react-native";
import { useAppForm, useFormFieldAnchor } from "./AppForm";
import { InjectedFormProps, WithFormProps } from "./types";

/** Lo que recibe el FastField de cada campo (además de lo de Formik). */
interface FieldUpdateProps {
  name: string;
  readonly: boolean;
  /** Los props del campo, para notar cuándo cambian. */
  fieldProps: Record<string, unknown>;
  formik?: {
    values?: unknown;
    errors?: unknown;
    touched?: unknown;
    isSubmitting?: boolean;
  };
}

// Hasta dónde se comparan los props (estilos, opciones de un select, el
// sufijo de unidad…). Más allá, o con demasiados valores, se toma como
// cambio: se vuelve a pintar de más, nunca se queda viejo.
const MAX_DEPTH = 6;
const MAX_NODES = 2000;

function sameValue(a: unknown, b: unknown, depth: number, budget: { left: number }): boolean {
  if (Object.is(a, b)) return true;
  // Las funciones no cuentan: casi siempre son nuevas en cada render y
  // volverían a pintar cada campo del formulario con cada tecla.
  if (typeof a === "function" && typeof b === "function") return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (depth >= MAX_DEPTH || --budget.left < 0) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!sameValue(a[i], b[i], depth + 1, budget)) return false;
    }
    return true;
  }

  // Un elemento, p. ej. right={<TextInput.Affix text="kg" />}.
  if (isValidElement(a) || isValidElement(b)) {
    return (
      isValidElement(a) &&
      isValidElement(b) &&
      a.type === b.type &&
      a.key === b.key &&
      sameValue(a.props, b.props, depth + 1, budget)
    );
  }

  const proto = Object.getPrototypeOf(a);
  if (proto !== Object.getPrototypeOf(b)) return false;
  if (a instanceof Date) return a.getTime() === (b as Date).getTime();
  // Instancias de clases (Map, refs de librerías…): solo la identidad.
  if (proto !== Object.prototype && proto !== null) return false;

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keys = Object.keys(objA);
  if (keys.length !== Object.keys(objB).length) return false;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!sameValue(objA[key], objB[key], depth + 1, budget)) return false;
  }
  return true;
}

/**
 * Cuándo vuelve a pintarse un campo: cambió su valor, su error, si se tocó,
 * el envío, su nombre (un renglón que se quitó de una tabla) o alguno de sus
 * props que no sea función (etiqueta, ayuda, opciones, el sufijo de unidad).
 * Antes un prop nuevo no se veía sin un `key`. Formik la llama con
 * (siguientes, anteriores).
 */
function shouldFieldUpdate(next: FieldUpdateProps, prev: FieldUpdateProps): boolean {
  if (next.name !== prev.name || next.readonly !== prev.readonly) return true;
  const a = prev.formik;
  const b = next.formik;
  if (
    getIn(a?.values, prev.name) !== getIn(b?.values, next.name) ||
    getIn(a?.errors, prev.name) !== getIn(b?.errors, next.name) ||
    getIn(a?.touched, prev.name) !== getIn(b?.touched, next.name) ||
    a?.isSubmitting !== b?.isSubmitting
  ) {
    return true;
  }
  return !sameValue(prev.fieldProps, next.fieldProps, 0, { left: MAX_NODES });
}

function MakeForm<TProps extends Record<string, any>>(
  WrappedComponent: React.ComponentType<TProps>,
  options?: { label?: boolean }
): React.FC<WithFormProps<TProps>> {
  return function FormWrappedComponent(props: WithFormProps<TProps>) {
    const {
      name,
      label,
      showError = true,
      errorStyle,
      containerStyle,
      // Ya no se pinta (ver types.ts); se saca para no pasarlo al campo.
      required: _required = false,
      optional = false,
      hint,
      ...restProps
    } = props;

    const formContext = useAppForm();
    const readonly = props.readonly || formContext?.readonly || false;
    const styles = useThemedStyles(makeStyles);

    // El onChange más reciente de la pantalla: el campo puede no volver a
    // pintarse (FastField) y seguiría llamando al de un render anterior.
    const latestOnChange = useRef(props.onChange);
    latestOnChange.current = props.onChange;

    // Al guardar con errores, AppForm lleva al primer campo marcado.
    const anchorRef = useRef<HostInstance>(null);
    useFormFieldAnchor(name, anchorRef);

    return (
      <FastField
        name={name}
        readonly={readonly}
        fieldProps={props}
        shouldUpdate={shouldFieldUpdate}
      >
        {({
          field,
          meta,
          form,
        }: {
          field: FieldConfig;
          meta: { error?: string; touched?: boolean };
          form: any;
        }) => {
          const onChange = (value: any) => {
            // Primero actualizar Formik
            form.setFieldValue(name, value);
            // Luego ejecutar el onChange del prop (si existe)
            latestOnChange.current?.(value);
          };

          const onBlur = () => {
            form.setFieldTouched(name, true);
          };

          const hasError = Boolean(meta.error && meta.touched);

          // Convertir el valor a string si es necesario para inputs de texto
          let fieldValue = field.value;

          const injectedProps: InjectedFormProps = {
            value: fieldValue,
            onChange,
            onBlur,
            error: meta.error,
            hasError,
            readonly: readonly || false,
          };

          return (
            <View ref={anchorRef} style={[styles.container, containerStyle]}>
              {label && options?.label !== false && (
                <InputLabel label={label} optional={optional && !readonly} />
              )}

              <WrappedComponent
                {...(restProps as unknown as TProps)}
                // Los campos que pintan su propia etiqueta (FormSwitch,
                // FormCheckBox) la reciben; antes se perdía y salía
                // "Selecciona una opción".
                {...(options?.label === false && label ? { label } : {})}
                {...injectedProps}
              />

              {showError && hasError ? (
                <FieldError message={meta.error} style={errorStyle} />
              ) : hint && !readonly ? (
                <FieldHint text={hint} />
              ) : null}
            </View>
          );
        }}
      </FastField>
    );
  };
}

// El error va en su propio componente: FastField solo se vuelve a pintar
// cuando cambia el campo, y así el color sigue al tema.
function FieldError(props: { message?: string; style?: object }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={[styles.errorText, props.style]}>{props.message}</Text>;
}

function FieldHint(props: { text: string }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.hint}>{props.text}</Text>;
}

/**
 * Etiqueta de un campo. Lo obligatorio es lo normal: no lleva asterisco, y
 * los campos que se pueden dejar vacíos dicen «(opcional)».
 */
export function InputLabel(props: { label: string; required?: boolean; optional?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.label}>
      {props.label}
      {props.optional && <Text style={styles.optional}> (opcional)</Text>}
    </Text>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {
    marginBottom: 18,
  },
  label: {
    marginBottom: 6,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: c.textSecondary,
  },
  optional: {
    fontWeight: "400",
    color: c.textMuted,
  },
  errorText: {
    color: c.error,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  hint: {
    color: c.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
}));

export default MakeForm;
