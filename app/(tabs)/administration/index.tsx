import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  Card,
  Divider,
  IconButton,
  Text,
  TouchableRipple,
} from "react-native-paper";

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: "company" | "catalog" | "users" | "settings" | "general";
}

export default function AdministrationScreen() {
  const router = useRouter();

  const { selectedCompany } = useAuth();

  const adminOptions: AdminOption[] = [
    // Configuración de la Empresa
    {
      id: "general-company",
      title: "Compañías",
      description: "Gestiona los datos fiscales y generales de la empresa",
      icon: "office-building",
      route: "/(tabs)/administration/companies",
      color: palette.primary,
      category: "general",
    },
    {
      id: "general-users",
      title: "Usuarios del Sistema",
      description: "Controla accesos y permisos de usuarios",
      icon: "account-key",
      route: "/(tabs)/administration/users",
      color: palette.secondary,
      category: "general",
    },

    {
      id: "company",
      title: "Compañía",
      description: "Gestiona los datos fiscales y generales de la empresa",
      icon: "office-building",
      route:
        "/(tabs)/administration/companies/" +
        (selectedCompany ? selectedCompany.id : ""),
      color: palette.primary,
      category: "company",
    },
    {
      id: "locations",
      title: "Sucursales",
      description: "Administra ubicaciones físicas y almacenes",
      icon: "map-marker-multiple",
      route: "/(tabs)/administration/locations",
      color: palette.info,
      category: "company",
    },
    /*     {
      id: "users",
      title: "Usuarios del Sistema",
      description: "Controla accesos y permisos de usuarios",
      icon: "account-key",
      route: "/(tabs)/home/users",
      color: palette.secondary,
      category: "users",
    }, */

    // Gestión de Personal
    {
      id: "workers",
      title: "Trabajadores",
      description: "Administra empleados, roles y asignaciones",
      icon: "account-group",
      route: "/(tabs)/administration/workers",
      color: palette.accent,
      category: "users",
    },
    {
      id: "roles",
      title: "Roles y Permisos",
      description: "Define roles y gestiona permisos de acceso",
      icon: "shield-account",
      route: "/(tabs)/home/roles",
      color: palette.error,
      category: "users",
    },

    // Catálogos
    {
      id: "categories",
      title: "Categorías",
      description: "Organiza productos en grupos lógicos",
      icon: "shape",
      route: "/(tabs)/home/categories",
      color: palette.primary,
      category: "catalog",
    },
    {
      id: "units",
      title: "Unidades de Medida",
      description: "Define unidades para inventarios (kg, pza, caja, etc.)",
      icon: "weight-kilogram",
      route: "/(tabs)/home/unidades",
      color: palette.warning,
      category: "catalog",
    },
    {
      id: "suppliers",
      title: "Proveedores",
      description: "Registra y gestiona proveedores de productos",
      icon: "truck-delivery",
      route: "/(tabs)/home/suppliers",
      color: palette.info,
      category: "catalog",
    },
    {
      id: "clients",
      title: "Clientes",
      description: "Gestiona información y historial de clientes",
      icon: "account-multiple",
      route: "/(tabs)/home/clientes",
      color: palette.accent,
      category: "catalog",
    },
  ];

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "general":
        return "Configuración General";
      case "company":
        return "Configuración de la Empresa";
      case "users":
        return "Gestión de Personal";
      case "catalog":
        return "Catálogos y Maestros";
      default:
        return "Otros";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "company":
        return "office-building-cog";
      case "users":
        return "account-cog";
      case "catalog":
        return "database-cog";
      default:
        return "cog";
    }
  };

  const categories = ["general", "company", "users", "catalog"] as const;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Categories */}
        {categories.map((category) => {
          const categoryOptions = adminOptions.filter(
            (opt) => opt.category === category
          );

          if (categoryOptions.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <IconButton
                  icon={getCategoryIcon(category)}
                  size={24}
                  iconColor={palette.primary}
                  style={{ margin: 0 }}
                />
                <Text variant="titleLarge" style={styles.categoryTitle}>
                  {getCategoryTitle(category)}
                </Text>
              </View>

              <Card style={styles.categoryCard}>
                <Card.Content style={{ padding: 0 }}>
                  {categoryOptions.map((option, index) => (
                    <React.Fragment key={option.id}>
                      <TouchableRipple
                        onPress={() => router.push(option.route as any)}
                        style={styles.optionItem}
                      >
                        <View style={styles.optionContent}>
                          <View
                            style={[
                              styles.optionIcon,
                              { backgroundColor: option.color + "20" },
                            ]}
                          >
                            <IconButton
                              icon={option.icon}
                              size={28}
                              iconColor={option.color}
                              style={{ margin: 0 }}
                            />
                          </View>

                          <View style={styles.optionText}>
                            <Text
                              variant="titleMedium"
                              style={styles.optionTitle}
                            >
                              {option.title}
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={styles.optionDescription}
                              numberOfLines={2}
                            >
                              {option.description}
                            </Text>
                          </View>

                          <IconButton
                            icon="chevron-right"
                            size={24}
                            iconColor={palette.textSecondary}
                            style={{ margin: 0 }}
                          />
                        </View>
                      </TouchableRipple>

                      {index < categoryOptions.length - 1 && (
                        <Divider style={{ marginLeft: 80 }} />
                      )}
                    </React.Fragment>
                  ))}
                </Card.Content>
              </Card>
            </View>
          );
        })}

        {/* Info Footer */}
        <View style={styles.footer}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <View style={styles.infoContent}>
                <IconButton
                  icon="information"
                  size={24}
                  iconColor={palette.info}
                  style={{ margin: 0 }}
                />
                <Text variant="bodySmall" style={styles.infoText}>
                  Estas opciones requieren permisos de administrador. Contacta
                  al administrador del sistema si necesitas acceso.
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  categoryTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  categoryCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 2,
    overflow: "hidden",
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: "600",
    color: palette.text,
    marginBottom: 2,
  },
  optionDescription: {
    color: palette.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: palette.info + "10",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: palette.info,
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: palette.textSecondary,
    lineHeight: 20,
  },
});
