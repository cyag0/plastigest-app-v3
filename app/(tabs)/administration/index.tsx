import AdminSection from "@/components/Administration/AdminSection";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, IconButton, Text } from "react-native-paper";

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: "system" | "company" | "location" | "catalog";
  requiredPermission?: string;
}

export default function AdministrationScreen() {
  const router = useRouter();
  const { selectedCompany, user, location } = useAuth();

  // Helper para verificar si el usuario tiene un permiso
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const adminOptions: AdminOption[] = [
    // === CONFIGURACIÓN DEL SISTEMA (Solo Super Admins) ===
    {
      id: "system-companies",
      title: "Gestión de Compañías",
      description: "Administra todas las empresas del sistema",
      icon: "office-building-cog",
      route: "/(tabs)/administration/companies",
      color: palette.primary,
      category: "system",
      requiredPermission: "companies_manage",
    },
    {
      id: "system-users",
      title: "Usuarios del Sistema",
      description: "Gestiona usuarios y accesos globales",
      icon: "account-cog",
      route: "/(tabs)/administration/users",
      color: palette.secondary,
      category: "system",
      requiredPermission: "users_manage",
    },

    // === CONFIGURACIÓN DE LA EMPRESA ===
    {
      id: "company-settings",
      title: "Mi Compañía",
      description: "Edita datos fiscales y configuración de tu empresa",
      icon: "office-building",
      route: selectedCompany
        ? `/(tabs)/administration/companies/${selectedCompany.id}/edit`
        : "/(tabs)/administration/companies",
      color: palette.primary,
      category: "company",
      requiredPermission: "companies_update",
    },
    {
      id: "company-users",
      title: "Usuarios de la Empresa",
      description: "Gestiona usuarios con acceso a esta empresa",
      icon: "account-group",
      route: "/(tabs)/administration/company-users",
      color: palette.secondary,
      category: "company",
      requiredPermission: "users_list",
    },
    {
      id: "company-locations",
      title: "Sucursales",
      description: "Administra ubicaciones y almacenes de tu empresa",
      icon: "map-marker-multiple",
      route: "/(tabs)/administration/locations",
      color: palette.info,
      category: "company",
      requiredPermission: "locations_list",
    },
    {
      id: "workers",
      title: "Trabajadores",
      description: "Administra empleados, roles y asignaciones de sucursales",
      icon: "account-hard-hat",
      route: "/(tabs)/administration/workers",
      color: palette.blue,
      category: "company",
      requiredPermission: "workers_list",
    },
    {
      id: "roles",
      title: "Roles y Permisos",
      description: "Define roles y gestiona permisos de acceso",
      icon: "shield-account",
      route: "/(tabs)/home/roles",
      color: palette.error,
      category: "company",
      requiredPermission: "roles_list",
    },

    // === MI SUCURSAL ===
    {
      id: "current-location",
      title: "Mi Sucursal",
      description: "Edita configuración de tu sucursal actual",
      icon: "store-edit",
      route: `/(tabs)/administration/locations/${location?.id}/edit`,
      color: palette.accent,
      category: "location",
      requiredPermission: "locations_update",
    },
    {
      id: "location-settings",
      title: "Configuración",
      description: "Ajustes y preferencias de tu sucursal",
      icon: "cog",
      route: `/(tabs)/administration/settings`,
      color: palette.primary,
      category: "location",
      requiredPermission: "locations_update",
    },
    {
      id: "current-workers",
      title: "Personal de mi Sucursal",
      description: "Gestiona solo trabajadores de tu sucursal actual",
      icon: "account-group",
      route: "/(tabs)/administration/current-workers",
      color: palette.secondary,
      category: "location",
      requiredPermission: "workers_list",
    },
    {
      id: "recurring-tasks",
      title: "Tareas Recurrentes",
      description: "Programa tareas automáticas (conteos, reportes)",
      icon: "calendar-clock",
      route: "/(tabs)/administration/recurring-tasks",
      color: palette.accent,
      category: "location",
      requiredPermission: "tasks_manage",
    },

    // === CATÁLOGOS ===
    {
      id: "categories",
      title: "Categorías",
      description: "Organiza productos en grupos lógicos",
      icon: "shape",
      route: "/(tabs)/administration/categories",
      color: palette.primary,
      category: "catalog",
      requiredPermission: "categories_list",
    },
    {
      id: "units",
      title: "Unidades de Medida",
      description: "Define unidades para inventarios (kg, pza, caja, etc.)",
      icon: "weight-kilogram",
      route: "/(tabs)/administration/unidades",
      color: palette.warning,
      category: "catalog",
      requiredPermission: "units_list",
    },
    {
      id: "packages",
      title: "Paquetes de Producto",
      description: "Define paquetes y presentaciones de productos",
      icon: "weight-kilogram",
      route: "/(tabs)/administration/packages",
      color: palette.warning,
      category: "catalog",
      requiredPermission: "packages_list",
    },
    {
      id: "suppliers",
      title: "Proveedores",
      description: "Registra y gestiona proveedores de productos",
      icon: "truck-delivery",
      route: "/(tabs)/home/suppliers",
      color: palette.blue,
      category: "catalog",
      requiredPermission: "suppliers_list",
    },
    {
      id: "clients",
      title: "Clientes",
      description: "Gestiona información y historial de clientes",
      icon: "account-multiple",
      route: "/(tabs)/administration/clientes",
      color: palette.accent,
      category: "catalog",
      requiredPermission: "customers_list",
    },
  ];

  // Filtrar opciones según permisos
  const visibleOptions = adminOptions.filter((option) => {
    if (!option.requiredPermission) return true;
    return true || hasPermission(option.requiredPermission);
  });

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "system":
        return "Configuración del Sistema";
      case "company":
        return "Mi Empresa";
      case "location":
        return "Mi Sucursal";
      case "catalog":
        return "Catálogos";
      default:
        return "Otros";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "system":
        return "server-security";
      case "company":
        return "office-building-cog";
      case "location":
        return "store-cog";
      case "catalog":
        return "database-cog";
      default:
        return "cog";
    }
  };

  const categories = ["system", "company", "location", "catalog"] as const;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Header */}
        {visibleOptions.length > 0 && (
          <Card style={styles.headerCard}>
            <Card.Content style={styles.headerContent}>
              <View style={styles.headerIconContainer}>
                <IconButton
                  icon="information-outline"
                  size={24}
                  iconColor={palette.blue}
                  style={{ margin: 0 }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={styles.headerTitle}>
                  {selectedCompany
                    ? `Configurando: ${selectedCompany.name}`
                    : "Selecciona una empresa para comenzar"}
                </Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  Solo verás las opciones para las que tienes permisos
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Categories as Accordion Sections */}
        {categories.map((category) => {
          const categoryOptions = visibleOptions.filter(
            (opt) => opt.category === category
          );

          return (
            <AdminSection
              key={category}
              title={getCategoryTitle(category)}
              icon={getCategoryIcon(category)}
              options={categoryOptions}
            />
          );
        })}

        {/* Empty state si no tiene permisos */}
        {visibleOptions.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <IconButton
                icon="shield-off"
                size={64}
                iconColor={palette.textSecondary}
                style={{ margin: 0 }}
              />
            </View>
            <Text variant="titleLarge" style={styles.emptyTitle}>
              Sin Acceso
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No tienes permisos para acceder a opciones de administración.
              Contacta a tu administrador.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: palette.blue + "15",
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: palette.blue,
    elevation: 0,
    shadowColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.blue + "25",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: palette.textSecondary,
    lineHeight: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.textSecondary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    color: palette.text,
    fontWeight: "700",
  },
  emptyText: {
    color: palette.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
