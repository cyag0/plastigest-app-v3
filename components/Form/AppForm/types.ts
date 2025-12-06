import React from "react";

// Props que el HOC requiere
export interface FormFieldProps {
  name: string;
  label?: string;
  showError?: boolean;
  errorStyle?: object;
  containerStyle?: object;
  required?: boolean;
  onChange?: (value: any) => void;
}

// Props que el HOC inyecta al componente envuelto
export interface InjectedFormProps<T = any> {
  value: T;
  onChange: (value: T) => void;
  onBlur: () => void;
  error?: string;
  hasError: boolean;
  readonly: boolean;
}

// Tipo genérico para el HOC que combina los props originales del componente
// con los props del formulario, excluyendo los que serán inyectados
export type WithFormProps<T> = Omit<T, keyof InjectedFormProps> &
  FormFieldProps;

// Tipo para el componente que acepta props de formulario
export type FormCompatibleComponent<T> = React.ComponentType<
  T & InjectedFormProps
>;

// Tipo para el HOC
export type FormHOC = <TProps extends Record<string, any>>(
  WrappedComponent: React.ComponentType<TProps>
) => React.FC<WithFormProps<TProps>>;
