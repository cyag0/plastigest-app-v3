/**
 * Catálogo completo de módulos de la app.
 *
 * Se llega desde el botón "Ver todos" del bloque "Accesos rápidos"
 * del Home. Muestra todos los módulos disponibles agrupados por
 * sección para que el usuario pueda llegar a cualquier parte sin
 * pasar por el sidebar (útil en mobile donde el sidebar está oculto).
 */

import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ModuleItem {
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
}

interface ModuleSection {
  label: string;
  items: ModuleItem[];
}

const MODULE_SECTIONS: ModuleSection[] = [
  {
    label: "General",
    items: [
      {
        label: "Inicio",
        description: "Dashboard principal",
        icon: "home-variant",
        route: "/(tabs)/home",
      },
      {
        label: "Reportes",
        description: "Métricas del negocio",
        icon: "view-dashboard-outline",
        route: "/(tabs)/reports",
      },
    ],
  },
  {
    label: "Inventario",
    items: [
      {
        label: "Inventario",
        description: "Stock por sucursal",
        icon: "archive-outline",
        route: "/(tabs)/inventory",
      },
      {
        label: "Producción",
        description: "Órdenes y fórmulas",
        icon: "factory",
        route: "/(tabs)/home/production",
      },
      {
        label: "Compras",
        description: "Compras a proveedores",
        icon: "cart-outline",
        route: "/(tabs)/home/purchases",
      },
      {
        label: "Ajustes",
        description: "Mermas y correcciones",
        icon: "clipboard-edit-outline",
        route: "/(tabs)/home/adjustment",
      },
      {
        label: "Transferencias",
        description: "Entre sucursales",
        icon: "swap-horizontal",
        route: "/(tabs)/home/transfers-menu",
      },
    ],
  },
  {
    label: "Ventas",
    items: [
      {
        label: "Ventas",
        description: "Ventas a clientes",
        icon: "cash-register",
        route: "/(tabs)/home/sales",
      },
      {
        label: "Pedidos",
        description: "Órdenes de venta",
        icon: "clipboard-list-outline",
        route: "/(tabs)/home/sales-orders",
      },
      {
        label: "Caja",
        description: "Cierre y movimientos",
        icon: "cash-multiple",
        route: "/(tabs)/home/cash",
      },
      {
        label: "Gastos",
        description: "Egresos y comprobantes",
        icon: "receipt-text-outline",
        route: "/(tabs)/home/expenses",
      },
      {
        label: "Recordatorios",
        description: "Cobros pendientes",
        icon: "bell-ring-outline",
        route: "/(tabs)/home/reminders",
      },
      {
        label: "Reportes de ventas",
        description: "Análisis detallado",
        icon: "chart-line",
        route: "/(tabs)/home/sales-reports",
      },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        label: "Administración",
        description: "Configuración general",
        icon: "cog-outline",
        route: "/(tabs)/administration",
      },
      {
        label: "Empresas",
        description: "Gestión de empresas",
        icon: "office-building-outline",
        route: "/(tabs)/home/companies",
      },
      {
        label: "Usuarios",
        description: "Cuentas y permisos",
        icon: "account-multiple-outline",
        route: "/(tabs)/home/users",
      },
      {
        label: "Roles",
        description: "Roles y permisos",
        icon: "shield-account-outline",
        route: "/(tabs)/home/roles",
      },
      {
        label: "Trabajadores",
        description: "Personal registrado",
        icon: "account-hard-hat-outline",
        route: "/(tabs)/home/workers",
      },
    ],
  },
];

export default function AllModulesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULE_SECTIONS;
    return MODULE_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      ),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  const totalModules = MODULE_SECTIONS.reduce(
    (acc, s) => acc + s.items.length,
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Todos los módulos</Text>
          <Text style={styles.subtitle}>
            {totalModules} módulos disponibles
          </Text>
        </View>

        {/* Buscador */}
        <View style={styles.searchBox}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={palette.textMuted}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar módulo…"
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Secciones */}
        {filteredSections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Sin resultados para "{query}"
            </Text>
          </View>
        ) : (
          filteredSections.map((section) => (
            <View key={section.label} style={styles.section}>
              <Text style={styles.sectionLabel}>{section.label}</Text>
              <View style={styles.grid}>
                {section.items.map((item) => (
                  <TouchableOpacity
                    key={item.route}
                    style={styles.card}
                    onPress={() => router.push(item.route as any)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconBox}>
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={palette.text}
                      />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text
                        style={styles.cardDescription}
                        numberOfLines={1}
                      >
                        {item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing[5],
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    gap: tokens.spacing[5],
  },
  header: {
    gap: 2,
  },
  title: {
    ...tokens.typography.h1,
    color: palette.text,
  },
  subtitle: {
    ...tokens.typography.bodySm,
    color: palette.textSecondary,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing[3],
    height: 40,
    ...(Platform.OS === "web"
      ? ({ transitionProperty: "border-color" } as any)
      : {}),
  },
  searchInput: {
    flex: 1,
    ...tokens.typography.body,
    color: palette.text,
    padding: 0,
  },
  empty: {
    padding: tokens.spacing[7],
    alignItems: "center",
  },
  emptyText: {
    ...tokens.typography.body,
    color: palette.textMuted,
  },
  section: {
    gap: tokens.spacing[3],
  },
  sectionLabel: {
    ...tokens.typography.h3,
    color: palette.text,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing[3],
  },
  card: {
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[3],
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    ...tokens.shadow.sm,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    ...tokens.typography.bodyMd,
    color: palette.text,
  },
  cardDescription: {
    ...tokens.typography.caption,
    color: palette.textMuted,
    marginTop: 1,
  },
});
