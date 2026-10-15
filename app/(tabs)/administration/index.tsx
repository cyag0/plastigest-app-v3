import AdminSection, {
  AdminOption,
} from "@/components/Administration/AdminSection";
import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
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
  const allLocations = useAllLocationsAccess();

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
      title: "Empresas",
      description: "Administra todas las empresas del sistema",
      icon: "office-building-cog",
      route: "/(tabs)/administration/companies",
      color: palette.primary,
      category: "system",
      requiredPermission: "companies_manage",
    },
    {
      id: "system-users",
      title: "Usuarios de todas las empresas",
      description: "Gestiona usuarios y accesos globales",
      icon: "account-cog",
      route: "/(tabs)/administration/users",
      color: palette.textSecondary,
      category: "system",
      // Ver a los de todas las empresas es del administrador del sistema
      // (con users_manage un encargado veía esta opción y solo a los suyos).
      requiredPermission: "system_admin",
    },

    // === CONFIGURACION DE LA EMPRESA ===
    {
      id: "company-settings",
      title: "Datos de la empresa",
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
      title: "Usuarios",
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
      id: "cash-registers",
      title: "Cajas",
      description: "Puntos de cobro de cada sucursal para abrir turnos",
      icon: "cash-register",
      route: "/(tabs)/administration/cash-registers",
      color: palette.success,
      category: "company",
      requiredPermission: "cash_registers_list",
    },
    {
      id: "activity-log",
      title: "Bitácora",
      description: "Quién hizo qué: ventas, cortes, cambios de precio y permisos",
      icon: "history",
      route: "/(stacks)/activity?user_id=all",
      color: palette.textSecondary,
      category: "company",
      requiredPermission: "users_read",
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
      title: "Notificaciones",
      description: "Configura qué eventos generan notificaciones y a quién",
      icon: "bell-cog-outline",
      route: "/(stacks)/notification-preferences",
      color: palette.warning,
      category: "company",
      requiredPermission: "companies_update",
    },

    // === ESTA SUCURSAL ===
    // Lo mismo que la empresa, pero solo de la sucursal actual: lo que se crea
    // aquí queda en ella.
    {
      id: "current-location",
      title: "Datos de la sucursal",
      description: "Nombre, dirección y contacto de la sucursal actual",
      icon: "store-edit",
      route: `/(tabs)/administration/locations/${location?.id}/edit`,
      color: palette.success,
      category: "location",
      requiredPermission: "locations_update",
    },
    {
      id: "location-users",
      title: "Usuarios",
      description: "Quién tiene acceso a esta sucursal y con qué rol",
      icon: "account-group",
      route: "/(tabs)/administration/current-location/users",
      color: palette.textSecondary,
      category: "location",
      requiredPermission: "users_list",
    },
    {
      id: "location-cash-registers",
      title: "Cajas",
      description: "Puntos de cobro de esta sucursal",
      icon: "cash-register",
      route: "/(tabs)/administration/cash-registers?scope=location",
      color: palette.success,
      category: "location",
      requiredPermission: "cash_registers_list",
    },
    {
      id: "location-notifications",
      title: "Notificaciones",
      description: "Avisos de esta sucursal y a quién le llegan",
      icon: "bell-cog-outline",
      route: "/(stacks)/notification-preferences?scope=location",
      color: palette.warning,
      category: "location",
      requiredPermission: "notifications_list",
    },
    {
      id: "location-activity",
      title: "Bitácora",
      description: "Qué se hizo en esta sucursal y quién lo hizo",
      icon: "history",
      route: "/(stacks)/activity?user_id=all&scope=location",
      color: palette.textSecondary,
      category: "location",
      requiredPermission: "users_read",
    },

    // === CATALOGOS ===
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
      title: "Paquetes",
      description: "Define paquetes y presentaciones de productos",
      icon: "package-variant",
      route: "/(tabs)/administration/packages",
      color: palette.warning,
      category: "catalog",
      // Los paquetes son parte del catálogo de productos (no existe un
      // permiso packages_list: la opción no se le mostraba a nadie).
      requiredPermission: "products_list",
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
      description: "Gestiona información e historial de clientes",
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
    // Sin sucursal seleccionada no hay "esta sucursal".
    if (option.category === "location" && !location) return false;
    // Quien no entra a todas las sucursales (locations_all) solo ve a los
    // usuarios de la suya: los tiene en "Esta sucursal".
    if (option.id === "company-users" && !allLocations) return false;
    if (!option.requiredPermission) return true;
    return hasPermission(option.requiredPermission);
  });

  const categories = [
    { key: "system", title: "Sistema", icon: "server-security" },
    { key: "company", title: selectedCompany?.name ?? "Empresa", icon: "office-building-cog" },
    { key: "location", title: "Esta sucursal", subtitle: location?.name, icon: "store-cog" },
    { key: "catalog", title: "Catálogos", icon: "database-cog" },
  ] as const;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!selectedCompany && (
          <Text style={styles.headerSubtitle}>Selecciona una empresa para empezar.</Text>
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
              subtitle={"subtitle" in category ? category.subtitle : undefined}
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
              description="No tienes permisos para acceder a opciones de administración. Contacta a tu administrador."
            />
          </View>
        )}

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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
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
    ...tokens.typography.body,
    color: palette.textSecondary,
    marginHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[4],
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
