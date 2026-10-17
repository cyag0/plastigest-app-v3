import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { FastField, FieldConfig, getIn } from "formik";
import React from "react";
import { Text, View } from "react-native";
import { useAppForm } from "./AppForm";
import { InjectedFormProps, WithFormProps } from "./types";

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

    return (
      <FastField
        name={name}
        readonly={readonly}
        shouldUpdate={(prevProps, nextProps) => {
          const prevFormik = prevProps.formik;
          const nextFormik = nextProps.formik;

          const valueChanged =
            getIn(prevFormik?.values, name) !== getIn(nextFormik?.values, name);
          const errorChanged =
            getIn(prevFormik?.errors, name) !== getIn(nextFormik?.errors, name);
          const touchedChanged =
            getIn(prevFormik?.touched, name) !==
            getIn(nextFormik?.touched, name);
          const isSubmittingChanged =
            prevFormik?.isSubmitting !== nextFormik?.isSubmitting;

          return (
            prevProps.readonly !== nextProps.readonly ||
            valueChanged ||
            errorChanged ||
            touchedChanged ||
            isSubmittingChanged
          );
        }}
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
            if (props.onChange) {
              props.onChange(value);
            }
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
            <View style={[styles.container, containerStyle]}>
              {label && options?.label !== false && (
                <InputLabel label={label} optional={optional} />
              )}

              <WrappedComponent
                {...(restProps as unknown as TProps)}
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
