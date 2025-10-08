import Services from "@/utils/services";
import React from "react";
import { View } from "react-native";
import AppForm from "../AppForm/AppForm";
import { FormProSelect } from "./index";

/**
 * EJEMPLOS DE USO DEL COMPONENTE AppProSelect
 *
 * Estos ejemplos muestran diferentes formas de usar el componente
 * en diferentes escenarios comunes de la aplicación.
 */

/**
 * EJEMPLO 1: Select Simple de Roles
 */
export function ExampleSimpleRoleSelect() {
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
 * EJEMPLO 2: Select Múltiple
 */
export function ExampleMultipleSelect() {
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
 * EJEMPLO 3: Diferentes Modelos
 */
export function ExampleDifferentModels() {
  return (
    <View style={{ padding: 16 }}>
      <AppForm api={Services.users}>
        <FormProSelect name="company_id" label="Empresa" model="companies" />

        <FormProSelect name="user_id" label="Usuario" model="users" />

        <FormProSelect
          name="category_id"
          label="Categoría"
          model="categories"
        />
      </AppForm>
    </View>
  );
}

/**
 * EJEMPLO 4: Con Callbacks
 */
export function ExampleWithCallbacks() {
  return (
    <AppForm api={Services.users}>
      <FormProSelect
        name="supplier_id"
        label="Proveedor"
        model="suppliers"
        labelField="company_name"
        onDataLoaded={(data) => console.log("Datos cargados:", data.length)}
        onError={(error) => console.error("Error:", error)}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 2: Select Múltiple de Permisos
 * Con configuración de campos personalizados
 */
export function ExampleMultiplePermissionsSelect() {
  return (
    <AppForm service={Services.admin.roles}>
      <FormProSelect
        name="permissions"
        label="Permisos del Rol"
        model="admin.permissions"
        multiple={true}
        labelField="display_name" // Mostrar nombre más amigable
        valueField="name" // Usar el nombre como valor
        hideSearchBox={false}
        fetchParams={{
          is_active: true, // Solo permisos activos
          per_page: 100, // Traer muchos registros
        }}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 3: Selects con Dependencias
 * Producto depende de la categoría seleccionada
 */
export function ExampleDependentSelects() {
  return (
    <AppForm service={Services.purchaseOrders}>
      {/* Select principal de categoría */}
      <FormProSelect
        name="category_id"
        label="Categoría"
        model="categories"
        placeholder="Selecciona una categoría"
        rules={{ required: "La categoría es requerida" }}
      />

      {/* Select dependiente de productos */}
      <FormProSelect
        name="product_id"
        label="Producto"
        model="products"
        placeholder="Selecciona un producto"
        dependsOn={{
          field: "category_id",
          value: useWatch({ name: "category_id" }),
        }}
        labelField="name"
        rules={{ required: "El producto es requerido" }}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 4: Select con Proveedor y Productos del Proveedor
 * Caso más complejo de dependencias
 */
export function ExampleSupplierProducts() {
  const supplierId = useWatch({ name: "supplier_id" });

  return (
    <AppForm service={Services.purchaseOrders}>
      <FormProSelect
        name="supplier_id"
        label="Proveedor"
        model="suppliers"
        labelField="company_name"
        placeholder="Selecciona un proveedor"
        rules={{ required: "El proveedor es requerido" }}
      />

      <FormProSelect
        name="product_ids"
        label="Productos"
        model="products"
        multiple={true}
        dependsOn={{
          field: "supplier_id",
          value: supplierId,
        }}
        fetchParams={{
          is_active: true,
          has_stock: true,
        }}
        placeholder="Selecciona productos"
        onDataLoaded={(products) => {
          console.log(`Cargados ${products.length} productos del proveedor`);
        }}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 5: Select de Ubicaciones por Empresa
 * Con manejo de errores personalizado
 */
export function ExampleCompanyLocations() {
  const companyId = useWatch({ name: "company_id" });

  return (
    <AppForm service={Services.movements}>
      <FormProSelect
        name="company_id"
        label="Empresa"
        model="companies"
        fetchParams={{ is_active: true }}
        rules={{ required: "La empresa es requerida" }}
      />

      <FormProSelect
        name="location_id"
        label="Ubicación"
        model="locations"
        dependsOn={{
          field: "company_id",
          value: companyId,
        }}
        onError={(error) => {
          console.error("Error cargando ubicaciones:", error);
          // Aquí podrías mostrar un toast o notificación
        }}
        onDataLoaded={(locations) => {
          if (locations.length === 0) {
            console.warn("No hay ubicaciones disponibles para esta empresa");
          }
        }}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 6: Select con Filtros Avanzados
 * Para casos donde necesitas filtrar los datos
 */
export function ExampleAdvancedFiltering() {
  return (
    <AppForm service={Services.salesOrders}>
      {/* Solo clientes activos */}
      <FormProSelect
        name="customer_id"
        label="Cliente"
        model="customers"
        fetchParams={{
          is_active: true,
          has_purchases: true, // Solo clientes que han comprado antes
        }}
        labelField="company_name"
        searchFields={["company_name", "contact_name", "email"]}
      />

      {/* Solo productos con stock */}
      <FormProSelect
        name="product_ids"
        label="Productos"
        model="products"
        multiple={true}
        fetchParams={{
          is_active: true,
          stock_gt: 0, // Solo productos con stock mayor a 0
        }}
        onDataLoaded={(products) => {
          const inStockCount = products.filter((p) => p.stock > 0).length;
          console.log(`${inStockCount} productos con stock disponible`);
        }}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 7: Select Anidado (Tres Niveles)
 * Empresa -> Ubicación -> Zona
 */
export function ExampleThreeLevelDependency() {
  const companyId = useWatch({ name: "company_id" });
  const locationId = useWatch({ name: "location_id" });

  return (
    <AppForm service={Services.movements}>
      <FormProSelect name="company_id" label="Empresa" model="companies" />

      <FormProSelect
        name="location_id"
        label="Ubicación"
        model="locations"
        dependsOn={{
          field: "company_id",
          value: companyId,
        }}
      />

      <FormProSelect
        name="zone_id"
        label="Zona"
        model="zones" // Asumiendo que existe el modelo zones
        dependsOn={{
          field: "location_id",
          value: locationId,
        }}
      />
    </AppForm>
  );
}

/**
 * EJEMPLO 8: Select con Estados de UI Personalizados
 * Mostrando cómo manejar diferentes estados
 */
export function ExampleCustomUIStates() {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <View>
      <AppForm service={Services.users}>
        <FormProSelect
          name="role_id"
          label="Rol Principal"
          model="admin.roles"
          fetchParams={{ is_primary: true }}
        />

        {showAdvanced && (
          <FormProSelect
            name="additional_roles"
            label="Roles Adicionales"
            model="admin.roles"
            multiple={true}
            fetchParams={{ is_primary: false }}
          />
        )}
      </AppForm>
    </View>
  );
}

/**
 * EJEMPLO 9: Select con Callbacks Completos
 * Ejemplo completo con todos los callbacks disponibles
 */
export function ExampleWithAllCallbacks() {
  return (
    <AppForm
      service={Services.users}
      onSuccess={(response) => {
        console.log("Usuario creado exitosamente:", response);
      }}
      onError={(error) => {
        console.error("Error creando usuario:", error);
      }}
    >
      <FormProSelect
        name="role_id"
        label="Rol"
        model="admin.roles"
        placeholder="Selecciona un rol"
        onDataLoaded={(roles) => {
          console.log(`Cargados ${roles.length} roles disponibles`);
        }}
        onError={(error) => {
          console.error("Error cargando roles:", error);
          // Aquí podrías mostrar una notificación al usuario
        }}
        rules={{
          required: "El rol es requerido",
          validate: (value) => {
            // Validación personalizada
            if (value === "super_admin") {
              return "No puedes asignar el rol de super admin";
            }
            return true;
          },
        }}
      />
    </AppForm>
  );
}
