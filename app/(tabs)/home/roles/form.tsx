import { FormCheckBox } from "@/components/Form/AppCheckBox";
import AppForm, { AppFormRef } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import palette from "@/constants/palette";
import { useAsync } from "@/hooks/AHooks";
import Services from "@/utils/services";
import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card } from "react-native-paper";

const availablePermissions = [
  { key: "crear", label: "Crear", description: "Crear nuevos registros" },
  { key: "leer", label: "Leer", description: "Ver información existente" },
  {
    key: "actualizar",
    label: "Actualizar",
    description: "Modificar registros",
  },
  { key: "eliminar", label: "Eliminar", description: "Borrar registros" },
  { key: "reportes", label: "Reportes", description: "Generar reportes" },
  {
    key: "configuracion",
    label: "Configuración",
    description: "Cambiar configuraciones del sistema",
  },
];

const availableModules = [
  { key: "usuarios", label: "Usuarios" },
  { key: "ventas", label: "Ventas" },
  { key: "compras", label: "Compras" },
  { key: "inventario", label: "Inventario" },
  { key: "reportes", label: "Reportes" },
  { key: "configuracion", label: "Configuración" },
];

interface Role {
  name: string;
  description: string;
  permissions: Record<string, boolean>;
}

interface RoleProps {
  id?: number;
  readonly?: boolean;
}

export default function CreateRoleScreen(props: RoleProps) {
  const [permissionsByResource, setPermissionsByResource] = React.useState<{
    [key: string]: App.Entities.Permission[];
  }>({});
  const [resources, setResources] = React.useState<App.Entities.Resource[]>([]);
  const [loading, setLoading] = React.useState(false);

  const formRef = useRef<AppFormRef<Role>>(null);

  useAsync(async () => {
    try {
      setLoading(true);
      const permissions = await Services.admin.permissions.getByResource();

      console.log("Fetched permissions:", permissions);

      setPermissionsByResource(permissions.permissions_by_resource);
      setResources(permissions.resources);
    } catch (error) {
      console.log("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  });

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  console.log(props);
  console.log(resources);

  return (
    <AppForm
      readonly={props.readonly}
      id={props.id}
      api={Services.admin.roles}
      ref={formRef}
      initialValues={{
        permissions: {},
        name: "",
        description: "",
      }}
    >
      <Card style={styles.card} mode="elevated">
        <FormInput name="name" label={"Nombre del rol"} />
        <FormInput name="description" label={"Descripción del rol"} />
      </Card>

      {(resources || []).map((resource: App.Entities.Resource, index) => {
        const permissions = permissionsByResource[resource.key] || [];

        return (
          <Card style={styles.card} key={resource.key}>
            <View>
              <View>
                <Card.Title
                  title={resource.label}
                  titleStyle={styles.permissionLabel}
                  subtitle={`Permisos para el módulo de ${resource.label}`}
                  subtitleStyle={styles.permissionDescription}
                />
              </View>
              <View>
                {permissions.map((permission) => {
                  return (
                    <FormCheckBox
                      key={permission.id}
                      text={permission.description}
                      name={`permissions.${permission.id}`}
                    />
                  );
                })}
              </View>
            </View>
          </Card>
        );
      })}
    </AppForm>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.textSecondary,
    marginBottom: 16,
  },
  subtitle: {
    color: palette.textSecondary,
    opacity: 0.7,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  permissionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  permissionCard: {
    flexBasis: "48%",
    minHeight: 80,
  },
  permissionContent: {
    padding: 8,
  },
  permissionLabel: {
    fontWeight: "bold",
  },
  permissionDescription: {
    fontSize: 12,
    opacity: 0.8,
  },
  selectedPermissions: {
    marginBottom: 24,
  },
  selectedTitle: {
    fontWeight: "bold",
    color: palette.textSecondary,
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedChip: {
    backgroundColor: palette.surface,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
  },
});
