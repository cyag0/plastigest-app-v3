import { rolesService } from "@/utils/services";
import { App } from "@/utils/services/types";
import { useFormik } from "formik";
import React from "react";
import * as Yup from "yup";
import AppInput from "../AppInput";
import AppForm from "./AppForm";

// Esquema de validación
const roleSchema = Yup.object().shape({
  name: Yup.string().required("El nombre es requerido"),
  description: Yup.string(),
  is_active: Yup.boolean(),
});

interface RoleFormProps {
  roleId?: number | string;
  onSuccess?: (role: App.Entities.Role) => void;
}

export default function RoleFormExample({ roleId, onSuccess }: RoleFormProps) {
  // Ejemplo 1: Usando formInstance externa
  const formInstance = useFormik<Partial<App.Entities.Role>>({
    initialValues: {
      name: "",
      description: "",
      is_active: true,
    },
    validationSchema: roleSchema,
    onSubmit: () => {}, // Se maneja en AppForm
  });

  return (
    <AppForm<App.Entities.Role>
      formInstance={formInstance}
      id={roleId}
      api={rolesService}
      validationSchema={roleSchema}
      onSuccess={(response, values) => {
        console.log("Rol guardado:", response);
        onSuccess?.(response.data);
      }}
      onError={(error, values) => {
        console.error("Error al guardar rol:", error);
      }}
    >
      <AppInput
        name="name"
        label="Nombre del rol"
        placeholder="Ej: Administrador"
      />

      <AppInput
        name="description"
        label="Descripción"
        placeholder="Descripción del rol"
        multiline
        numberOfLines={3}
      />

      {/* Otros campos del formulario */}
    </AppForm>
  );
}

// Ejemplo 2: Con initialValues como función asíncrona
export function RoleFormWithAsyncInitialValues() {
  const loadUserPreferences = async () => {
    // Simular carga de preferencias del usuario
    return {
      name: "Rol personalizado",
      description: "Descripción desde preferencias",
      is_active: true,
    };
  };

  return (
    <AppForm<App.Entities.Role>
      initialValues={loadUserPreferences}
      api={rolesService}
      onSuccess={(response) => {
        console.log("Rol creado:", response);
      }}
    >
      <AppInput name="name" label="Nombre del rol" />
      <AppInput name="description" label="Descripción" />
    </AppForm>
  );
}

// Ejemplo 3: Con initialValues como objeto estático
export function RoleFormWithStaticValues() {
  return (
    <AppForm<App.Entities.Role>
      initialValues={{
        name: "Nuevo Rol",
        description: "Descripción por defecto",
        is_active: true,
      }}
      api={rolesService}
      onSuccess={(response) => {
        console.log("Rol creado:", response);
      }}
    >
      <AppInput name="name" label="Nombre del rol" />
      <AppInput name="description" label="Descripción" />
    </AppForm>
  );
}

// Ejemplo 4: Con handleSubmit personalizado
export function RoleFormWithCustomSubmit() {
  const handleCustomSubmit = async (
    values: App.Entities.Role,
    formInstance: any
  ) => {
    // Lógica personalizada antes de guardar
    console.log("Procesando valores:", values);

    // Validaciones adicionales
    if (values.name?.toLowerCase() === "admin") {
      throw new Error('No se puede usar el nombre "admin"');
    }

    // Guardar usando el servicio
    const response = await rolesService.store(values);

    // Lógica post-guardado
    console.log("Rol guardado exitosamente");

    return response;
  };

  return (
    <AppForm<App.Entities.Role>
      initialValues={{ name: "", description: "", is_active: true }}
      onSubmit={handleCustomSubmit}
      onSuccess={(response) => {
        console.log("Éxito:", response);
      }}
      onError={(error) => {
        console.error("Error:", error);
      }}
    >
      <AppInput name="name" label="Nombre del rol" />
      <AppInput name="description" label="Descripción" />
    </AppForm>
  );
}

// Ejemplo 5: Formulario sin botones automáticos
export function RoleFormWithoutButtons() {
  const formInstance = useFormik<Partial<App.Entities.Role>>({
    initialValues: { name: "", description: "" },
    onSubmit: () => {},
  });

  const handleSave = () => {
    formInstance.handleSubmit();
  };

  return (
    <>
      <AppForm<App.Entities.Role>
        formInstance={formInstance}
        api={rolesService}
        showSubmitButton={false}
        showResetButton={false}
        onSuccess={(response) => {
          console.log("Guardado:", response);
        }}
      >
        <AppInput name="name" label="Nombre del rol" />
        <AppInput name="description" label="Descripción" />
      </AppForm>

      {/* Botones personalizados fuera del formulario */}
      <Button onPress={handleSave}>Guardar Rol</Button>
    </>
  );
}
