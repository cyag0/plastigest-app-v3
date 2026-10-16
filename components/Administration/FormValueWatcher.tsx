import { getIn, useFormikContext } from "formik";
import { useEffect } from "react";

interface FormValueWatcherProps {
  /** Campo del formulario a observar (admite rutas como "unit.company_id"). */
  name: string;
  /**
   * Se llama al montar y cada vez que cambia el valor (p. ej. cuando AppForm
   * termina de cargar el registro). Pásale una función estable, como el
   * setter de un useState.
   */
  onChange: (value: unknown) => void;
}

/**
 * Avisa al componente que contiene el AppForm cuando cambia un valor del
 * formulario. Sirve para decidir props del propio AppForm según el registro
 * cargado: por ejemplo, no ofrecer "Editar Registro" en un registro que el
 * backend no deja modificar. Va dentro de los children del AppForm.
 */
export default function FormValueWatcher({ name, onChange }: FormValueWatcherProps) {
  const { values } = useFormikContext();
  const value = getIn(values, name);

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  return null;
}
