import palette from "@/constants/palette";
import { useCan } from "@/hooks/useCan";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type BreadcrumbItem = {
  label: string;
  href: string;
  current: boolean;
  /** El usuario puede abrir esa pantalla (si no, la miga es solo texto). */
  accessible?: boolean;
};

const segmentLabels: Record<string, string> = {
  administration: "Administración",
  adjustment: "Ajustes",
  "all-modules": "Todos los módulos",
  carrito: "Carrito",
  cash: "Caja",
  categories: "Categorías",
  "change-password": "Cambiar contraseña",
  clientes: "Clientes",
  closing: "Cierres anteriores",
  sessions: "Turnos de caja",
  companies: "Compañías",
  "company-users": "Usuarios",
  "current-location": "Esta sucursal",
  edit: "Editar",
  expenses: "Gastos",
  form: "Nuevo",
  formv2: "Nuevo",
  formulas: "Fórmulas",
  help: "Ayuda",
  history: "Historial",
  home: "Inicio",
  inventory: "Inventario",
  kiosk: "Kiosko",
  kardex: "Kárdex",
  activity: "Actividad",
  locations: "Sucursales",
  movements: "Movimientos",
  packages: "Paquetes",
  packaging: "Empaque",
  "cash-registers": "Cajas",
  "cash-register-sessions": "Turnos",
  pos: "Punto de venta",
  notifications: "Notificaciones",
  "notification-preferences": "Preferencias",
  pending: "Pendientes",
  preferences: "Preferencias",
  products: "Productos",
  production: "Producción",
  profile: "Perfil",
  productos: "Productos",
  purchases: "Compras",
  reminders: "Recordatorios",
  reports: "Dashboard",
  roles: "Roles",
  sales: "Ventas",
  scanner: "Escáner",
  "sales-orders": "Pedidos",
  "business-reports": "Reportes del negocio",
  selectCompany: "Seleccionar empresa",
  selectLocation: "Seleccionar sucursal",
  suggestions: "Qué pedir",
  suppliers: "Proveedores",
  tasks: "Tareas",
  "task-notification-guide": "Tareas y notificaciones",
  transfers: "Transferencias",
  unidades: "Unidades",
  "transfers-menu": "Transferencias",
  users: "Usuarios",
  "weekly-inventory": "Inventario semanal",
};

const pathLabels: Record<string, string> = {
  "/administration/current-location": "Esta sucursal",
  "/home/purchases/formv2": "Nueva compra",
  "/home/sales/formv2": "Nueva venta",
  "/home/transfers/formv2": "Nueva solicitud",
  "/inventory/weekly-inventory/form": "Crear inventario",
  "/inventory/products/type/all": "Todos",
};

// Algunos segmentos no tienen ruta index propia, por lo que su href intermedio
// debe redirigir a la pantalla real (ej. el menu de transferencias).
const hrefOverrides: Record<string, string> = {
  "/home/transfers": "/home/transfers-menu",
  // Lo de la sucursal (usuarios…) se abre desde la sección "Esta sucursal"
  // de Administración.
  "/administration/current-location": "/administration",
};

const hiddenSegments = new Set(["", "(tabs)", "(stacks)", "index"]);

const GENERIC_LABELS = new Set(["Nuevo", "Detalle", "Editar"]);

// Segmentos que forman parte de la URL pero no son una pantalla navegable
// (ej. /inventory/products/type/[slug]): se conservan en el href de los
// siguientes items pero no se muestran como miga.
// "setup": /kiosk/setup se muestra como "Inicio › Kiosko" (la miga de /kiosk
// queda como la actual: así nunca lleva a la pantalla del cliente).
const skippedSegments = new Set(["type", "setup"]);

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

// Formularios que con ?id= muestran un registro existente: "Detalle", no "Nuevo".
const formSegments = new Set(["form", "formv2"]);

function buildBreadcrumbs(pathname: string, hasRecordId = false): BreadcrumbItem[] {
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
    const isLast = index === rawSegments.length - 1;
    const label =
      isLast && hasRecordId && formSegments.has(segment)
        ? "Detalle"
        : getSegmentLabel(segment, href, nextSegment);

    if (!label || skippedSegments.has(segment)) {
      return;
    }

    const isLastVisibleSegment = rawSegments.slice(index + 1).every((next) => next === "index" || (isDynamicSegment(next) && rawSegments[index + 2] === "edit"));

    items.push({
      label,
      href: hrefOverrides[href] ?? href,
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
  compact = false,
}: {
  embedded?: boolean;
  showSingleItem?: boolean;
  /** Pantallas angostas: sólo "‹ Página actual"; la flecha lleva al nivel anterior. */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const { id } = useGlobalSearchParams<{ id?: string | string[] }>();
  const { canAccessRoute } = useCan();

  if (Platform.OS !== "web") {
    return null;
  }

  const hasRecordId = (Array.isArray(id) ? id[0] : id) !== undefined && String(id).trim() !== "";
  // Las migas a pantallas que el usuario no puede abrir quedan como texto
  // (antes llevaban a "No tienes permiso…").
  const items = buildBreadcrumbs(pathname, hasRecordId).map((item) => ({
    ...item,
    accessible: canAccessRoute(item.href),
  }));

  if (items.length === 0 || (items.length <= 1 && !showSingleItem)) {
    return null;
  }

  if (compact) {
    const current = items[items.length - 1];
    const parent = items.length > 1 ? items[items.length - 2] : null;
    // La flecha lleva al nivel anterior que el usuario puede abrir (si no
    // puede abrir ninguno, a Inicio).
    const backTarget =
      items
        .slice(0, -1)
        .reverse()
        .find((item) => item.accessible) ?? (parent ? { label: "Inicio", href: "/home" } : null);
    // "Nuevo" o "Detalle" solos no dicen dónde estás: se agrega la sección.
    const title =
      parent && GENERIC_LABELS.has(current.label)
        ? `${current.label} · ${parent.label}`
        : current.label;

    return (
      <View style={[styles.wrapper, embedded && styles.embeddedWrapper, styles.compactContent]}>
        {backTarget && (
          <Pressable
            onPress={() => router.push(backTarget.href as any)}
            style={({ pressed }) => [styles.compactBack, pressed && styles.pressedItem]}
            accessibilityRole="link"
            accessibilityLabel={`Volver a ${backTarget.label}`}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
          </Pressable>
        )}
        <Text numberOfLines={1} style={styles.compactLabel}>
          {title}
        </Text>
      </View>
    );
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
              disabled={item.current || !item.accessible}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [styles.item, item.current && styles.currentItem, pressed && styles.pressedItem]}
              accessibilityRole={item.current || !item.accessible ? "text" : "link"}
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
  compactContent: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    gap: 2,
  },
  compactBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  compactLabel: {
    flexShrink: 1,
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
});
