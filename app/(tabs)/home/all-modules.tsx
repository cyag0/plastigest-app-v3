/**
 * Catálogo completo de módulos de la app.
 *
 * Se llega desde el botón "Ver todos" del bloque "Accesos rápidos"
 * del Home. Muestra todos los módulos disponibles agrupados por
 * sección para que el usuario pueda llegar a cualquier parte sin
 * pasar por el sidebar (útil en mobile donde el sidebar está oculto).
 *
 * Mismo diseño que Administración y Perfil: listas agrupadas, una fila por
 * módulo con su ícono y su nombre. La `description` no se pinta; sirve para
 * el buscador.
 */

import EmptyState from "@/components/App/EmptyState";
import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import ListSearchbar from "@/components/App/ListSearchbar";
import { useCan } from "@/hooks/useCan";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

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
      {
        label: "Reportes PDF y Excel",
        description: "Ventas, inventario valorizado, mermas y caja",
        icon: "file-chart-outline",
        route: "/(tabs)/home/business-reports",
      },
      {
        label: "Ayuda",
        description: "Guías de cada módulo",
        icon: "help-circle-outline",
        route: "/(stacks)/help",
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
        label: "Ajustes de inventario",
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
      {
        label: "Qué pedir",
        description: "Qué mandar, comprar o producir para mañana",
        icon: "chart-timeline-variant",
        route: "/(tabs)/home/transfers/suggestions",
      },
    ],
  },
  {
    label: "Ventas",
    items: [
      {
        label: "Punto de venta",
        description: "Cobrar en caja por turno",
        icon: "point-of-sale",
        route: "/(stacks)/pos",
      },
      {
        label: "Ventas",
        description: "Ventas a clientes",
        icon: "cash-register",
        route: "/(tabs)/home/sales",
      },
      {
        label: "Kiosko",
        description: "Autoservicio: el cliente pide y paga en caja",
        icon: "tablet-dashboard",
        route: "/(stacks)/kiosk/setup",
      },
/*       {
        label: "Pedidos",
        description: "Órdenes de venta",
        icon: "clipboard-list-outline",
        route: "/(tabs)/home/sales-orders",
      }, */
      {
        label: "Caja",
        description: "Turnos, cortes y movimientos",
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
        // La gestión real de usuarios (sucursales y rol por sucursal) vive en
        // Administración. /home/users era un formulario de solo nombre y correo.
        label: "Usuarios",
        description: "Cuentas, sucursales y roles",
        icon: "account-multiple-outline",
        route: "/(tabs)/administration/company-users",
      },
      {
        label: "Roles",
        description: "Roles y permisos",
        icon: "shield-account-outline",
        route: "/(tabs)/home/roles",
      },
    ],
  },
];

export default function AllModulesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Solo se listan los módulos que el usuario puede abrir, según el mapa
  // central de permisos (utils/permissions/routePermissions.ts).
  const { canAccessRoute } = useCan();

  const sections = useMemo(
    () =>
      MODULE_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => canAccessRoute(item.route)),
      })).filter((section) => section.items.length > 0),
    [canAccessRoute]
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      ),
    })).filter((section) => section.items.length > 0);
  }, [query, sections]);

  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ListSearchbar
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar módulo…"
      />

      {filteredSections.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            compact
            icon="magnify"
            title="Sin resultados"
            description={`Ningún módulo coincide con "${query.trim()}".`}
          />
        </View>
      ) : (
        filteredSections.map((section) => (
          <ListSection key={section.label} title={section.label}>
            <ListGroup>
              {section.items.map((item) => (
                <ListRow
                  key={item.route}
                  icon={item.icon}
                  title={item.label}
                  titleLines={1}
                  accessibilityLabel={`${item.label}: ${item.description}`}
                  onPress={() => router.push(item.route as any)}
                />
              ))}
            </ListGroup>
          </ListSection>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = themedStyles((c) => ({
  scroll: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 22,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  empty: {
    paddingTop: 24,
  },
}));
