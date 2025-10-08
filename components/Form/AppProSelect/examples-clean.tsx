import Services from "@/utils/services";
import React from "react";
import { View } from "react-native";
import AppForm from "../AppForm/AppForm";
import { FormProSelect } from "./index";

/**
 * EJEMPLOS DE USO DEL COMPONENTE AppProSelect
 */

/**
 * Ejemplo 1: Select simple de roles
 */
export function ExampleRoleSelect() {
  return (
    <AppForm api={Services.users}>
      <FormProSelect
        name="role_id"
        label="Rol del Usuario"
        model="admin.roles"
        placeholder="Selecciona un rol"
      />
    </AppForm>
  );
}

/**
 * Ejemplo 2: Select múltiple de permisos
 */
export function ExampleMultiplePermissions() {
  return (
    <AppForm api={Services.admin.roles}>
      <FormProSelect
        name="permissions"
        label="Permisos del Rol"
        model="admin.permissions"
        multiple={true}
        labelField="display_name"
        valueField="name"
      />
    </AppForm>
  );
}

/**
 * Ejemplo 3: Select con configuración personalizada
 */
export function ExampleCustomConfiguration() {
  return (
    <View style={{ padding: 16 }}>
      <FormProSelect
        name="supplier_id"
        label="Proveedor"
        model="suppliers"
        labelField="company_name"
        valueField="id"
        placeholder="Selecciona un proveedor"
        onDataLoaded={(data) =>
          console.log(`Cargados ${data.length} proveedores`)
        }
        onError={(error) => console.error("Error cargando proveedores:", error)}
      />
    </View>
  );
}

/**
 * Ejemplo 4: Múltiples selects en un formulario
 */
export function ExampleMultipleSelects() {
  return (
    <View style={{ padding: 16 }}>
      <AppForm api={Services.users}>
        <FormProSelect name="company_id" label="Empresa" model="companies" />

        <FormProSelect name="role_id" label="Rol" model="admin.roles" />

        <FormProSelect
          name="permissions"
          label="Permisos Adicionales"
          model="admin.permissions"
          multiple={true}
        />
      </AppForm>
    </View>
  );
}
