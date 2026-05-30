import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type BreadcrumbItem = {
  label: string;
  href: string;
  current: boolean;
};

const segmentLabels: Record<string, string> = {
  administration: "Administracion",
  adjustment: "Ajustes",
  cash: "Caja",
  categories: "Categorias",
  closing: "Cierres",
  companies: "Companias",
  "company-users": "Usuarios de compania",
  "current-location": "Mi sucursal",
  edit: "Editar",
  form: "Nuevo",
  formv2: "Nuevo",
  history: "Historial",
  home: "Inicio",
  inventory: "Inventario",
  kiosk: "Quiosco",
  locations: "Sucursales",
  notifications: "Notificaciones",
  "notification-preferences": "Preferencias",
  pending: "Pendientes",
  products: "Productos",
  production: "Produccion",
  profile: "Perfil",
  purchases: "Compras",
  reports: "Dashboard",
  roles: "Roles",
  sales: "Ventas",
  "sales-orders": "Pedidos",
  "sales-reports": "Reportes de ventas",
  selectCompany: "Seleccionar empresa",
  selectLocation: "Seleccionar sucursal",
  suppliers: "Proveedores",
  tasks: "Tareas",
  "task-notification-guide": "Tareas y notificaciones",
  transfers: "Transferencias",
  "transfers-menu": "Transferencias",
  users: "Usuarios",
  "weekly-inventory": "Inventario semanal",
  workers: "Trabajadores",
};

const pathLabels: Record<string, string> = {
  "/administration/current-location": "Mi sucursal",
  "/home/purchases/formv2": "Nueva compra",
  "/home/sales/formv2": "Nueva venta",
  "/home/transfers/formv2": "Nueva solicitud",
  "/home/transfers/log-guide": "Guia del log",
  "/inventory/weekly-inventory/form": "Crear inventario",
};

const hiddenSegments = new Set(["", "(tabs)", "(stacks)", "index"]);

function isDynamicSegment(segment: string) {
  return /^\d+$/.test(segment) || /^[0-9a-f-]{12,}$/i.test(segment);
}

function getSegmentLabel(segment: string, href: string, nextSegment?: string) {
  if (pathLabels[href]) {
    return pathLabels[href];
  }

  if (isDynamicSegment(segment)) {
    return nextSegment === "edit" ? "" : "Detalle";
  }

  return segmentLabels[segment] || segment.replace(/-/g, " ").replace(/^./, (value) => value.toUpperCase());
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const cleanPath = pathname.split("?")[0].split("#")[0];
  const rawSegments = cleanPath.split("/").filter((segment) => !hiddenSegments.has(segment));

  if (rawSegments.length === 0 || rawSegments[0] === "login") {
    return [];
  }

  const items: BreadcrumbItem[] = [];
  const hrefSegments: string[] = [];

  if (rawSegments[0] !== "home") {
    items.push({ label: "Inicio", href: "/home", current: false });
  }

  rawSegments.forEach((segment, index) => {
    hrefSegments.push(segment);
    const href = `/${hrefSegments.join("/")}`;
    const nextSegment = rawSegments[index + 1];
    const label = getSegmentLabel(segment, href, nextSegment);

    if (!label) {
      return;
    }

    const isLastVisibleSegment = rawSegments.slice(index + 1).every((next) => next === "index" || (isDynamicSegment(next) && rawSegments[index + 2] === "edit"));

    items.push({
      label,
      href,
      current: isLastVisibleSegment || index === rawSegments.length - 1,
    });
  });

  if (items.length > 0) {
    return items.map((item, index) => ({ ...item, current: index === items.length - 1 }));
  }

  return items;
}

export default function WebBreadcrumb({
  embedded = false,
  showSingleItem = false,
}: {
  embedded?: boolean;
  showSingleItem?: boolean;
}) {
  const pathname = usePathname();

  if (Platform.OS !== "web") {
    return null;
  }

  const items = buildBreadcrumbs(pathname);

  if (items.length === 0 || (items.length <= 1 && !showSingleItem)) {
    return null;
  }

  return (
    <View style={[styles.wrapper, embedded && styles.embeddedWrapper]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={embedded && styles.embeddedScroll}
        contentContainerStyle={[styles.content, embedded && styles.embeddedContent]}
      >
        {items.map((item, index) => (
          <View key={`${item.href}-${index}`} style={styles.itemGroup}>
            {index > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color={palette.textSecondary} />}
            <Pressable
              disabled={item.current}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [styles.item, item.current && styles.currentItem, pressed && styles.pressedItem]}
              accessibilityRole="link"
              accessibilityLabel={item.label}
            >
              {index === 0 && <MaterialCommunityIcons name="home-outline" size={16} color={item.current ? palette.primary : palette.textSecondary} />}
              <Text numberOfLines={1} style={[styles.label, item.current && styles.currentLabel]}>
                {item.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#F8F5EF",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  embeddedWrapper: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  embeddedScroll: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    gap: 4,
  },
  embeddedContent: {
    minHeight: 40,
  },
  itemGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  item: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  currentItem: {
    backgroundColor: palette.primary + "18",
  },
  pressedItem: {
    backgroundColor: palette.surface,
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: "800",
  },
  currentLabel: {
    color: palette.primary,
  },
});
