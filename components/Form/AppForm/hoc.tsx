import palette from "@/constants/palette";
import { FastField, FieldConfig, getIn } from "formik";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
      required = false,
      ...restProps
    } = props;

    const formContext = useAppForm();
    const readonly = props.readonly || formContext?.readonly || false;

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
            form.setFieldValue(name, value);
          };

          const onBlur = () => {
            form.setFieldTouched(name, true);
          };

          const hasError = Boolean(meta.error && meta.touched);

          // Convertir el valor a string si es necesario para inputs de texto
          let fieldValue = field.value;
          if (fieldValue !== null && fieldValue !== undefined && typeof fieldValue !== 'string' && typeof fieldValue !== 'boolean') {
            fieldValue = String(fieldValue);
          }

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
                <InputLabel required={required} label={label} />
              )}

              <WrappedComponent
                {...(restProps as unknown as TProps)}
                {...injectedProps}
              />

              {showError && hasError && (
                <Text style={[styles.errorText, errorStyle]}>{meta.error}</Text>
              )}
            </View>
          );
        }}
      </FastField>
    );
  };
}

export function InputLabel(props: { label: string; required: boolean }) {
  return (
    <Text style={styles.label}>
      {props.required && <Text style={{ color: "red" }}>* </Text>}
      {props.label}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: palette.textSecondary,
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },
});

export default MakeForm;
