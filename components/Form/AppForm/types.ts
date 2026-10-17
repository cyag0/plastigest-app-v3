import React from "react";

// Props que el HOC requiere
export interface FormFieldProps {
  name: string;
  label?: string;
  showError?: boolean;
  errorStyle?: object;
  containerStyle?: object;
  /**
   * Campo obligatorio. Ya no se pinta un asterisco: lo obligatorio es lo
   * normal y se marcan los opcionales (ver `optional`).
   */
  required?: boolean;
  /** Agrega «(opcional)» junto a la etiqueta. */
  optional?: boolean;
  /** Ayuda corta debajo del campo (se oculta mientras hay un error). */
  hint?: string;
  /** Solo lectura para este campo aunque el formulario sea editable. */
  readonly?: boolean;
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
