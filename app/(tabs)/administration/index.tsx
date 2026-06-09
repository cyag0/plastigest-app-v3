import AdminSection, {
  AdminOption,
} from "@/components/Administration/AdminSection";
import EmptyState from "@/components/App/EmptyState";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function AdministrationScreen() {
  const { selectedCompany, user, location, hasPermission: authHasPermission } =
    useAuth();

  // Helper para verificar si el usuario tiene un permiso
  const hasPermission = (permission: string) => {
    if (!permission) return true;
    return (
      authHasPermission(permission) ||
      user?.permissions?.includes(permission as any) ||
      false
    );
  };

  const adminOptions: AdminOption[] = [
    // === CONFIGURACION DEL SISTEMA (Solo Super Admins) ===
    {
      id: "system-companies",
      title: "Gestion de companias",
      description: "Administra todas las empresas del sistema",
      icon: "office-building-cog",
      route: "/(tabs)/administration/companies",
      color: palette.primary,
      category: "system",
      requiredPermission: "companies_manage",
    },
    {
      id: "system-users",
      title: "Usuarios del sistema",
      description: "Gestiona usuarios y accesos globales",
      icon: "account-cog",
      route: "/(tabs)/administration/users",
      color: palette.textSecondary,
      category: "system",
      requiredPermission: "users_manage",
    },

    // === CONFIGURACION DE LA EMPRESA ===
    {
      id: "company-settings",
      title: "Mi compania",
      description: "Edita datos fiscales y configuracion de tu empresa",
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
      title: "Usuarios de la empresa",
      description: "Gestiona usuarios con acceso a esta empresa",
      icon: "account-group",
      route: "/(tabs)/administration/company-users",
      color: palette.textSecondary,
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
      id: "roles",
      title: "Roles y permisos",
      description: "Define roles y gestiona permisos de acceso",
      icon: "shield-account",
      route: "/(tabs)/home/roles",
      color: palette.primary,
      category: "company",
      requiredPermission: "roles_list",
    },
    {
      id: "notification-preferences",
      title: "Preferencias de notificaciones",
      description: "Configura que eventos generan notificaciones y a quien",
      icon: "bell-cog-outline",
      route: "/(stacks)/notification-preferences",
      color: palette.warning,
      category: "company",
      requiredPermission: "companies_update",
    },

    // === MI SUCURSAL ===
    {
      id: "current-location",
      title: "Mi sucursal",
      description: "Edita configuracion de tu sucursal actual",
      icon: "store-edit",
      route: `/(tabs)/administration/locations/${location?.id}/edit`,
      color: palette.success,
      category: "location",
      requiredPermission: "locations_update",
    },
    {
      id: "location-settings",
      title: "Configuracion",
      description: "Ajustes y preferencias de tu sucursal",
      icon: "cog",
      route: `/(tabs)/administration/settings`,
      color: palette.textSecondary,
      category: "location",
      requiredPermission: "locations_update",
    },
    {
      id: "current-workers",
      title: "Personal de mi sucursal",
      description: "Gestiona solo trabajadores de tu sucursal actual",
      icon: "account-group-outline",
      route: "/(tabs)/administration/current-workers",
      color: palette.textSecondary,
      category: "location",
      requiredPermission: "workers_list",
    },
    {
      id: "recurring-tasks",
      title: "Tareas recurrentes",
      description: "Programa tareas automaticas (conteos, reportes)",
      icon: "calendar-clock",
      route: "/(tabs)/administration/recurring-tasks",
      color: palette.success,
      category: "location",
      requiredPermission: "tasks_manage",
    },

    // === CATALOGOS ===
    {
      id: "categories",
      title: "Categorias",
      description: "Organiza productos en grupos logicos",
      icon: "shape",
      route: "/(tabs)/administration/categories",
      color: palette.primary,
      category: "catalog",
      requiredPermission: "categories_list",
    },
    {
      id: "units",
      title: "Unidades de medida",
      description: "Define unidades para inventarios (kg, pza, caja, etc.)",
      icon: "weight-kilogram",
      route: "/(tabs)/administration/unidades",
      color: palette.warning,
      category: "catalog",
      requiredPermission: "units_list",
    },
    {
      id: "packages",
      title: "Paquetes de producto",
      description: "Define paquetes y presentaciones de productos",
      icon: "package-variant",
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
      route: "/(tabs)/administration/suppliers",
      color: palette.info,
      category: "catalog",
      requiredPermission: "suppliers_list",
    },
    {
      id: "clients",
      title: "Clientes",
      description: "Gestiona informacion e historial de clientes",
      icon: "account-multiple",
      route: "/(tabs)/administration/clientes",
      color: palette.success,
      category: "catalog",
      requiredPermission: "customers_list",
    },
  ];

  // Filtrar opciones segun permisos:
  // - Si la opcion no requiere permiso, se muestra.
  // - Si requiere, debe estar en user.permissions (cargado por AuthContext).
  const visibleOptions = adminOptions.filter((option) => {
    if (!option.requiredPermission) return true;
    return hasPermission(option.requiredPermission);
  });

  const categories = [
    { key: "system", title: "Configuracion del sistema", icon: "server-security" },
    { key: "company", title: "Mi empresa", icon: "office-building-cog" },
    { key: "location", title: "Mi sucursal", icon: "store-cog" },
    { key: "catalog", title: "Catalogos", icon: "database-cog" },
  ] as const;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============== INFO HEADER ============== */}
        {visibleOptions.length > 0 && (
          <View style={styles.headerCard}>
            <View style={styles.headerIconBox}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={palette.info}
              />
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.headerTitle}>
                {selectedCompany
                  ? `Configurando: ${selectedCompany.name}`
                  : "Selecciona una empresa para comenzar"}
              </Text>
              <Text style={styles.headerSubtitle}>
                Solo veras las opciones para las que tienes permisos
              </Text>
            </View>
          </View>
        )}

        {/* ============== CATEGORIES ============== */}
        {categories.map((category) => {
          const categoryOptions = visibleOptions.filter(
            (opt) => opt.category === category.key,
          );

          return (
            <AdminSection
              key={category.key}
              title={category.title}
              icon={category.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              options={categoryOptions}
            />
          );
        })}

        {/* ============== EMPTY STATE ============== */}
        {visibleOptions.length === 0 && (
          <View style={styles.emptyWrapper}>
            <EmptyState
              icon="shield-off-outline"
              title="Sin acceso"
              description="No tienes permisos para acceder a opciones de administracion. Contacta a tu administrador."
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {visibleOptions.length} opcion
            {visibleOptions.length === 1 ? "" : "es"} disponible
            {visibleOptions.length === 1 ? "" : "s"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
  },
  scrollContent: {
    paddingTop: tokens.spacing[4],
    paddingBottom: tokens.spacing[10],
  },

  // --- Header card ---
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    marginHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[5],
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: palette.info,
    gap: tokens.spacing[3],
    ...tokens.shadow.sm,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: palette.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    fontWeight: "600",
  },
  headerSubtitle: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },

  // --- Empty state ---
  emptyWrapper: {
    paddingTop: tokens.spacing[10],
  },

  // --- Footer ---
  footer: {
    alignItems: "center",
    paddingTop: tokens.spacing[5],
  },
  footerText: {
    ...tokens.typography.caption,
    color: palette.textMuted,
  },
});
