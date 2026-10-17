/**
 * Un rol y sus permisos: alta, edición y detalle (el detalle abre este mismo
 * formulario en solo lectura).
 *
 * Arriba el nombre y la descripción; luego los permisos: una plantilla por
 * puesto para empezar, el alcance (todas las sucursales, administrador del
 * sistema) y los módulos agrupados por área, cada uno en un renglón que dice
 * qué tiene marcado y se abre para cambiarlo. Antes eran una tarjeta con
 * sombra por módulo, chips de colores, un contador con barra de progreso y
 * plantillas que no decían qué marcaban.
 *
 * Lo que se manda no cambia: `permissions` es el mapa {id_del_permiso: true|false}.
 */

import { ListGroup, ListRow, ListSectionTitle } from "@/components/App/ListGroup";
import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import FormNote from "@/components/Auth/FormNote";
import AppForm, { AppFormRef, useAppForm } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { FormSection } from "@/components/Form/FormLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useFormikContext } from "formik";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Modal, Portal, Switch } from "react-native-paper";
import * as Yup from "yup";

// ---------------------------------------------------------------------------
// Tipos locales. El backend agrupa los permisos por recurso y devuelve la
// metadata del recurso (label + icono MaterialCommunityIcons). Cada permiso
// tiene la forma `{recurso}_{accion}` en `name` (ej. "products_create").
// ---------------------------------------------------------------------------
interface PermissionItem {
  id: number;
  name: string;
  description: string;
  resource: string;
}

interface ResourceItem {
  key: string;
  label: string;
  description: string;
  icon: string;
}

interface RoleValues {
  name: string;
  description: string;
  permissions: Record<string, boolean>;
  /** Solo al editar o ver: el rol del sistema (Super Admin) no se cambia. */
  is_system?: boolean;
}

interface RoleProps {
  id?: number;
  readonly?: boolean;
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** AppForm también expone setReadonly (el «Editar» del detalle). */
type RoleFormRef = AppFormRef<RoleValues> & { setReadonly?: (value: boolean) => void };

const LIST_ROUTE = "/(tabs)/home/roles";

// Referencia estable: AppForm vuelve a cargar el rol cada vez que cambia.
const INITIAL_VALUES: RoleValues = { permissions: {}, name: "", description: "" };

/** Tamaños de las columnas (roles.name 100, roles.description 255). */
const LIMITS = { name: 100, description: 255 };

const tooLong = (max: number) => `Máximo ${max} caracteres`;

const validationSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required("Escribe el nombre del rol")
    .max(LIMITS.name, tooLong(LIMITS.name)),
  description: Yup.string().nullable().max(LIMITS.description, tooLong(LIMITS.description)),
});

// Lo que dice cada casilla según la acción del permiso.
const ACTION_LABELS: Record<string, string> = {
  list: "Listar",
  read: "Ver detalle",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  export: "Exportar",
  import: "Importar",
  view: "Ver",
  manage: "Gestionar",
  admin: "Administrar",
};

// Orden de las casillas dentro de un módulo (el backend los manda revueltos).
// Las acciones propias del módulo (punto de venta, descuentos…) van primero.
const ACTION_ORDER = ["view", "list", "read", "create", "update", "delete", "export", "import", "manage", "admin"];

// Permisos que amplían hasta dónde llega el rol. Se buscan por nombre (no por
// módulo) y ninguna plantilla de puesto los marca:
// - locations_all: entrar y operar en todas las sucursales de la empresa (y
//   administrar al personal de todas). Antes eso lo daba, sin decirlo,
//   «Ubicaciones › Listar».
// - system_admin: administrador del sistema (todas las empresas). Solo se da
//   a mano, ni siquiera con «Acceso total».
// Se marcan en «Alcance» y no entre las casillas de su módulo: «Marcar todos»
// en Configuración ya no hace a nadie administrador del sistema sin decirlo.
const ALL_LOCATIONS = "locations_all";
const SYSTEM_ADMIN = "system_admin";
const SCOPE_PERMISSIONS = [ALL_LOCATIONS, SYSTEM_ADMIN];

// Etiqueta de los permisos cuya acción no dice lo que hacen.
const PERMISSION_LABELS: Record<string, string> = {
  [ALL_LOCATIONS]: "Todas las sucursales",
  [SYSTEM_ADMIN]: "Administrador del sistema",
  sales_pos: "Punto de venta",
  sales_kiosk: "Usar el kiosko de autoservicio",
  sales_discount: "Precios y descuentos",
  // Registrar, corregir y deshacer ajustes (InventoryAdjustmentController);
  // también decide quién recibe los avisos de inventario.
  inventory_manage: "Hacer ajustes",
  // Solo decide quién recibe los avisos de compras.
  purchases_manage: "Recibir avisos",
  // Cambiar las preferencias de notificaciones.
  notifications_manage: "Configurar avisos",
};

// Módulos que en la app se llaman distinto que en el backend. Los demás solo
// pasan a minúsculas ("Turnos de Caja" → "Turnos de caja").
const RESOURCE_OVERRIDES: Record<string, Partial<ResourceItem>> = {
  locations: {
    label: "Sucursales",
    description:
      "Datos de las sucursales. «Listar» solo muestra la lista; para entrar y trabajar en todas, activa «Todas las sucursales» en Alcance.",
  },
  formulas: {
    label: "Procesos",
    description: "Lo que entra y lo que sale en cada proceso de producción.",
  },
  sales_orders: { label: "Pedidos" },
  transfers: { label: "Transferencias" },
  dashboard: { label: "Dashboard" },
};

// Áreas en que se agrupan los módulos (antes era una sola lista de 30). Lo
// que el backend agregue después y no esté aquí va en «Otros».
const MODULE_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Ventas y caja",
    keys: ["sales", "sales_orders", "customers", "cash_registers", "cash_register_sessions", "cash_movements", "expenses"],
  },
  { title: "Inventario y compras", keys: ["inventory", "movements", "transfers", "purchases", "suppliers"] },
  { title: "Producción", keys: ["production", "production_orders", "formulas"] },
  { title: "Catálogo", keys: ["products", "categories", "units", "inventory_types"] },
  { title: "Reportes, tareas y avisos", keys: ["dashboard", "reports", "tasks", "reminders", "notifications"] },
  { title: "Administración", keys: ["users", "roles", "permissions", "companies", "locations", "settings"] },
];

// Módulos de administración. Las plantillas "Operativo" y "Solo lectura" no
// los tocan: gestionar usuarios, roles, empresas o sucursales no es operación
// diaria.
const ADMIN_RESOURCES = ["users", "roles", "permissions", "companies", "locations"];

const OPERATIVO_ACTIONS = ["create", "read", "update", "list", "view", "export"];
// Fuera de «Operativo»: cerrar el turno de otro cajero (con el efectivo que se
// capture, y la diferencia queda a su nombre) es de encargado.
const OPERATIVO_EXCLUDED = ["cash_registers_update"];

// Plantillas por puesto. Solo nombres que existen en PermissionSeeder; el
// alcance (todas las sucursales, administrador del sistema) nunca va aquí.
const CAJERO = [
  // Cobrar en el punto de venta y abrir/cerrar su turno
  "sales_pos",
  // Buscar ventas y reimprimir tickets
  "sales_read", "sales_list",
  // Pedidos: tomarlos y cobrarlos
  "sales_orders_create", "sales_orders_read", "sales_orders_update", "sales_orders_list",
  "customers_create", "customers_read", "customers_list",
  // Consultar productos y existencias
  "products_read", "products_list", "inventory_read", "inventory_list",
  // Gastos pagados con el efectivo de la caja
  "expenses_create", "expenses_read", "expenses_list",
  "tasks_read", "tasks_update", "tasks_list",
  "reminders_read", "reminders_update", "reminders_list",
  "notifications_read", "notifications_list",
];

const ENCARGADO = [
  // Ventas, descuentos, caja y turnos (también cerrar los de otros)
  "sales_pos", "sales_discount", "sales_create", "sales_read", "sales_update", "sales_list",
  "sales_orders_create", "sales_orders_read", "sales_orders_update", "sales_orders_delete", "sales_orders_list",
  "customers_create", "customers_read", "customers_update", "customers_list",
  "cash_registers_create", "cash_registers_read", "cash_registers_update", "cash_registers_list",
  "cash_register_sessions_read", "cash_register_sessions_list",
  "cash_movements_create", "cash_movements_read", "cash_movements_update", "cash_movements_list",
  "expenses_create", "expenses_read", "expenses_update", "expenses_delete", "expenses_list", "expenses_export",
  // Inventario (conteos y ajustes), compras, producción y transferencias
  "inventory_create", "inventory_read", "inventory_update", "inventory_delete", "inventory_list", "inventory_manage",
  "movements_read", "movements_list",
  "transfers_create", "transfers_read", "transfers_update", "transfers_delete", "transfers_list",
  "purchases_create", "purchases_read", "purchases_update", "purchases_delete", "purchases_list",
  "production_orders_create", "production_orders_read", "production_orders_update",
  "production_orders_delete", "production_orders_list",
  "formulas_read", "formulas_list",
  "suppliers_create", "suppliers_read", "suppliers_update", "suppliers_list",
  // Catálogo solo de consulta: productos y precios son de toda la empresa
  "products_read", "products_list", "categories_read", "categories_list",
  "units_read", "units_list", "inventory_types_read", "inventory_types_list",
  "reports_view", "reports_export",
  "dashboard_view",
  "tasks_create", "tasks_read", "tasks_update", "tasks_delete", "tasks_list",
  "reminders_create", "reminders_read", "reminders_update", "reminders_delete", "reminders_list",
  // Sin notifications_manage: un encargado podría apagar en su sucursal los
  // avisos de mermas o diferencias de conteo que vigilan su trabajo. Se puede
  // dar a mano.
  "notifications_read", "notifications_list",
  // Su personal (Administración › Esta sucursal) y los datos de su sucursal
  "users_create", "users_read", "users_update", "users_list",
  "roles_read", "roles_list",
  "locations_read", "locations_update",
  "settings_read",
];

const PRODUCCION = [
  "production_orders_create", "production_orders_read", "production_orders_update", "production_orders_list",
  "formulas_read", "formulas_list",
  "products_read", "products_list", "inventory_read", "inventory_list",
  "categories_read", "categories_list", "units_read", "units_list",
  "inventory_types_read", "inventory_types_list",
  // Pedir insumos a otra sucursal y seguir sus transferencias
  "transfers_create", "transfers_read", "transfers_list",
  "tasks_read", "tasks_update", "tasks_list",
  "reminders_read", "reminders_update", "reminders_list",
  "notifications_read", "notifications_list",
];

const ALMACEN = [
  "purchases_create", "purchases_read", "purchases_update", "purchases_delete", "purchases_list",
  "suppliers_create", "suppliers_read", "suppliers_update", "suppliers_list",
  // Conteos de inventario
  "inventory_create", "inventory_read", "inventory_update", "inventory_list",
  // Pedir, aprobar, enviar y recibir transferencias
  "transfers_create", "transfers_read", "transfers_update", "transfers_list",
  "products_read", "products_list", "categories_read", "categories_list",
  "units_read", "units_list", "inventory_types_read", "inventory_types_list",
  "tasks_read", "tasks_update", "tasks_list",
  "reminders_create", "reminders_read", "reminders_update", "reminders_list",
  "notifications_read", "notifications_list",
];

/** Lo que una plantilla sabe de cada permiso. */
interface PermissionInfo {
  name: string;
  action: string;
  resource: string;
}

const isOperational = (p: PermissionInfo) =>
  !ADMIN_RESOURCES.includes(p.resource) &&
  p.name !== ALL_LOCATIONS &&
  p.name !== SYSTEM_ADMIN;

interface Preset {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  match: (p: PermissionInfo) => boolean;
}

// Plantillas rápidas: marcan un conjunto de permisos de una sola vez para
// acelerar el llenado; luego se ajusta lo que haga falta.
const PRESETS: Preset[] = [
  {
    key: "all",
    label: "Acceso total",
    description:
      "Todos los permisos, en todas las sucursales. No lo hace administrador del sistema.",
    icon: "shield-check-outline",
    match: (p) => p.name !== SYSTEM_ADMIN,
  },
  {
    key: "encargado",
    label: "Encargado de sucursal",
    description:
      "Todo lo de su sucursal: ventas y descuentos, caja y turnos, inventario y ajustes, compras, producción, transferencias y su personal. Sin otras sucursales ni cambios al catálogo.",
    icon: "account-tie-outline",
    match: (p) => ENCARGADO.includes(p.name),
  },
  {
    key: "cajero",
    label: "Cajero",
    description:
      "Punto de venta y su turno, pedidos, clientes, gastos de la caja y consultar productos y existencias. Sin descuentos.",
    icon: "point-of-sale",
    match: (p) => CAJERO.includes(p.name),
  },
  {
    key: "produccion",
    label: "Producción",
    description:
      "Órdenes de producción, consultar procesos, productos y existencias, y pedir insumos por transferencia.",
    icon: "factory",
    match: (p) => PRODUCCION.includes(p.name),
  },
  {
    key: "almacen",
    label: "Almacén y compras",
    description:
      "Compras y recepción, proveedores, conteos de inventario y transferencias (pedir, enviar y recibir).",
    icon: "warehouse",
    match: (p) => ALMACEN.includes(p.name),
  },
  {
    key: "operativo",
    label: "Operativo",
    description:
      "Crear, ver y editar en todos los módulos de operación, con punto de venta. Sin administración, descuentos, cerrar turnos ajenos ni otras sucursales.",
    icon: "briefcase-outline",
    match: (p) =>
      isOperational(p) &&
      (OPERATIVO_ACTIONS.includes(p.action) || p.name === "sales_pos") &&
      !OPERATIVO_EXCLUDED.includes(p.name),
  },
  {
    key: "lectura",
    label: "Solo lectura",
    description: "Ver y consultar los módulos de operación, sin cambiar nada.",
    icon: "eye-outline",
    match: (p) => isOperational(p) && ["read", "list", "view"].includes(p.action),
  },
];

// Deriva la acción de un permiso quitando el prefijo del recurso.
function getAction(perm: PermissionItem): string {
  if (perm.resource && perm.name?.startsWith(perm.resource + "_")) {
    return perm.name.slice(perm.resource.length + 1);
  }
  const idx = perm.name?.lastIndexOf("_") ?? -1;
  return idx > -1 ? perm.name.slice(idx + 1) : perm.name;
}

function actionLabel(perm: PermissionItem): string {
  return (
    PERMISSION_LABELS[perm.name] ??
    ACTION_LABELS[getAction(perm)] ??
    perm.description ??
    perm.name
  );
}

/** Las acciones propias primero, luego listar, ver, crear, editar, eliminar… */
function sortPermissions(perms: PermissionItem[]): PermissionItem[] {
  const rank = (p: PermissionItem) => ACTION_ORDER.indexOf(getAction(p));
  return perms
    .map((p, index) => ({ p, index }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.index - b.index)
    .map(({ p }) => p);
}

/** "Turnos de Caja" → "Turnos de caja". */
function sentenceCase(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : text;
}

/** ["Listar", "Ver detalle", "Crear"] → "Listar, ver detalle y crear". */
function joinLabels(labels: string[]): string {
  const words = labels.map((label, i) => (i === 0 ? label : label.charAt(0).toLowerCase() + label.slice(1)));
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ===========================================================================
// Pantalla: carga el catálogo de permisos y monta el formulario. Lo demás
// vive en <RoleEditor/>, dentro de Formik (AppForm), para leer y escribir los
// valores de forma reactiva.
// ===========================================================================
export default function CreateRoleScreen(props: RoleProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [catalog, setCatalog] = useState<{
    permissionsByResource: Record<string, PermissionItem[]>;
    resources: ResourceItem[];
  } | null>(null);
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const [attempt, setAttempt] = useState(0);
  // El rol no se puede guardar: tiene permisos que quien edita no tiene, o es
  // el rol del sistema. La barra de abajo solo deja "Volver".
  const [locked, setLocked] = useState(false);
  const formRef = useRef<RoleFormRef>(null);

  const styles = useThemedStyles((c) => ({
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.background },
    back: { flex: 1 },
  }));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setProblem(null);
        const data = await Services.admin.permissions.getByResource();
        if (!alive) return;
        setCatalog({
          permissionsByResource:
            (data.permissions_by_resource as Record<string, PermissionItem[]>) || {},
          resources: ((data.resources as ResourceItem[]) || []).map((r) => ({
            ...r,
            label: sentenceCase(r.label),
            ...RESOURCE_OVERRIDES[r.key],
          })),
        });
      } catch (error) {
        // Antes la pantalla quedaba sin módulos y sin decir por qué.
        if (alive) setProblem(recordLoadProblem(error, "No se pudieron cargar los permisos."));
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  // A la lista o al detalle de donde se vino. Si la pantalla se abrió por
  // enlace o se recargó, la pila empieza en Inicio: se va a la lista (o al
  // detalle del rol).
  const fallback = props.id ? `${LIST_ROUTE}/${props.id}` : LIST_ROUTE;
  const leave = useCallback(() => {
    const state = navigation.getState?.();
    const previous = state && state.index > 0 ? state.routes[state.index - 1]?.name : undefined;
    if (previous && String(previous).startsWith("roles/")) navigation.goBack();
    else router.replace(fallback as any);
  }, [navigation, router, fallback]);

  // El detalle se vuelve a pedir al regresar de editar el rol.
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!props.readonly) return;
      if (focusedOnce.current) formRef.current?.reload();
      focusedOnce.current = true;
    }, [props.readonly]),
  );

  // Editado en el mismo detalle («Editar»): vuelve a verse en solo lectura.
  const handleSuccess = () => {
    if (props.readonly) {
      formRef.current?.setReadonly?.(true);
      formRef.current?.reload();
    } else {
      leave();
    }
  };
  const handleCancel = () => {
    if (props.readonly) {
      formRef.current?.resetForm();
      formRef.current?.setReadonly?.(true);
      setLocked(false);
    } else {
      leave();
    }
  };

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        errorTitle="No se pudieron cargar los permisos"
        onRetry={() => setAttempt((n) => n + 1)}
      />
    );
  }

  if (!catalog) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <AppForm
      permissionPrefix="roles"
      readonly={props.readonly}
      id={props.id}
      api={Services.admin.roles}
      ref={formRef}
      validationSchema={validationSchema}
      initialValues={INITIAL_VALUES}
      submitButtonText={props.id ? "Guardar cambios" : "Guardar rol"}
      successMessage={props.id ? "Cambios guardados" : "Rol guardado"}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
      // Sin guardar, la barra solo deja regresar.
      showSubmitButton={!locked}
      showCancelButton={!locked}
      additionalSubmitButtons={
        locked ? (
          <Button mode="outlined" onPress={handleCancel} style={styles.back}>
            Volver
          </Button>
        ) : undefined
      }
    >
      <RoleEditor
        resources={catalog.resources}
        permissionsByResource={catalog.permissionsByResource}
        editing={!!props.id}
        onLockedChange={setLocked}
      />
    </AppForm>
  );
}

// ===========================================================================
// Editor del rol. Vive dentro de AppForm/Formik.
// ===========================================================================
function RoleEditor({
  resources,
  permissionsByResource,
  editing,
  onLockedChange,
}: {
  resources: ResourceItem[];
  permissionsByResource: Record<string, PermissionItem[]>;
  editing: boolean;
  onLockedChange: (locked: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { readonly } = useAppForm();
  const { permissions: myPermissions } = useAuth();

  const { values, setFieldValue } = useFormikContext<RoleValues>();
  // Ref con los valores más recientes para que los callbacks sean estables
  // (no se recrean en cada tecleo) sin perder acceso al estado actual.
  const valuesRef = useRef(values);
  useLayoutEffect(() => {
    valuesRef.current = values;
  });

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [presetsOpen, setPresetsOpen] = useState(false);
  // Qué hizo la última plantilla (o "Ninguno"): se explica debajo.
  const [applied, setApplied] = useState<string | null>(null);
  // Casillas de dos en dos en el teléfono, de tres en tres con más ancho.
  const [columns, setColumns] = useState(2);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width >= 520 ? 3 : 2;
    if (next !== columns) setColumns(next);
  };

  // Lista plana de permisos (para plantillas y contadores).
  const allPermissions = useMemo(
    () => Object.values(permissionsByResource).flat(),
    [permissionsByResource],
  );

  // El backend no deja dar ni quitar a un rol permisos que uno no tiene
  // (403 "No puedes quitar permisos que tú no tienes."), salvo al
  // administrador del sistema: esas casillas quedan con candado.
  const isSystemAdmin = myPermissions.includes(SYSTEM_ADMIN);
  const lockedIds = useMemo(() => {
    if (isSystemAdmin) return new Set<number>();
    const mine = new Set(myPermissions);
    return new Set(allPermissions.filter((p) => !mine.has(p.name)).map((p) => p.id));
  }, [allPermissions, isSystemAdmin, myPermissions]);

  const permissionByName = useMemo(() => {
    const map: Record<string, PermissionItem> = {};
    allPermissions.forEach((p) => {
      map[p.name] = p;
    });
    return map;
  }, [allPermissions]);
  const allLocationsPerm = permissionByName[ALL_LOCATIONS];
  const systemAdminPerm = permissionByName[SYSTEM_ADMIN];

  const selectedMap = useMemo(() => values.permissions || {}, [values.permissions]);
  const selectedCount = useMemo(
    () => allPermissions.filter((p) => selectedMap[p.id]).length,
    [allPermissions, selectedMap],
  );
  const totalCount = allPermissions.length;
  // Permisos del rol que quien edita no tiene: con ellos el backend rechaza
  // el guardado completo (no se pueden conservar ni quitar), así que el rol
  // queda de solo lectura para él.
  const lockedSelected = useMemo(
    () => allPermissions.filter((p) => selectedMap[p.id] && lockedIds.has(p.id)).length,
    [allPermissions, selectedMap, lockedIds],
  );
  const frozen = !readonly && lockedSelected > 0;
  // El rol del sistema siempre tiene todos los permisos (el backend no deja cambiarlo).
  const systemRole = !!values.is_system;
  const locked = !readonly && (frozen || systemRole);

  useEffect(() => {
    onLockedChange(locked);
  }, [locked, onLockedChange]);

  // Casillas de cada módulo, en orden y sin las de alcance (van en «Alcance»).
  const modulePermissions = useMemo(() => {
    const map: Record<string, PermissionItem[]> = {};
    Object.entries(permissionsByResource).forEach(([key, perms]) => {
      map[key] = sortPermissions(perms.filter((p) => !SCOPE_PERMISSIONS.includes(p.name)));
    });
    return map;
  }, [permissionsByResource]);

  // Áreas con sus módulos visibles según el buscador. En solo lectura solo
  // los que tienen algo marcado (resumen de lo que el rol puede).
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byKey = new Map(resources.map((r) => [r.key, r]));
    const used = new Set<string>();
    const list = MODULE_GROUPS.map((group) => {
      const items = group.keys
        .map((key) => byKey.get(key))
        .filter((r): r is ResourceItem => !!r);
      items.forEach((r) => used.add(r.key));
      return { title: group.title, items };
    });
    const others = resources.filter((r) => !used.has(r.key));
    if (others.length) list.push({ title: "Otros", items: others });

    return list
      .map((group) => ({
        ...group,
        items: group.items.filter((r) => {
          const perms = modulePermissions[r.key] || [];
          if (perms.length === 0) return false;
          if (readonly && !perms.some((p) => selectedMap[p.id])) return false;
          return !q || r.label.toLowerCase().includes(q);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [resources, modulePermissions, query, readonly, selectedMap]);

  const visibleKeys = useMemo(
    () => groups.flatMap((group) => group.items.map((r) => r.key)),
    [groups],
  );
  const allExpanded = visibleKeys.length > 0 && visibleKeys.every((key) => expanded[key]);
  const anyModuleSelected = useMemo(
    () => Object.values(modulePermissions).some((perms) => perms.some((p) => selectedMap[p.id])),
    [modulePermissions, selectedMap],
  );

  // --- Callbacks estables -------------------------------------------------
  const setPermission = useCallback(
    (id: number, value: boolean) => {
      // Marcar o desmarcar uno bloqueado terminaría en un 403 al guardar.
      if (lockedIds.has(id)) return;
      const map = { ...(valuesRef.current.permissions || {}) };
      map[id] = value;
      setFieldValue("permissions", map);
    },
    [lockedIds, setFieldValue],
  );

  const togglePermission = useCallback(
    (id: number) => setPermission(id, !valuesRef.current.permissions?.[id]),
    [setPermission],
  );

  const setModule = useCallback(
    (ids: number[], value: boolean) => {
      const map = { ...(valuesRef.current.permissions || {}) };
      ids.forEach((id) => {
        if (lockedIds.has(id)) return;
        map[id] = value;
      });
      setFieldValue("permissions", map);
    },
    [lockedIds, setFieldValue],
  );

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const applyPreset = useCallback(
    (preset: Preset) => {
      const current = valuesRef.current.permissions || {};
      const map: Record<string, boolean> = {};
      let skipped = 0;
      // El módulo sale de la llave del grupo: los permisos del endpoint no
      // siempre traen `resource`.
      Object.entries(permissionsByResource).forEach(([resource, perms]) => {
        perms.forEach((p) => {
          const matches = preset.match({
            name: p.name,
            action: getAction(p),
            resource: p.resource || resource,
          });
          const isLocked = lockedIds.has(p.id);
          if (matches && isLocked && !current[p.id]) skipped++;
          // Un permiso bloqueado se queda como estaba.
          map[p.id] = isLocked ? !!current[p.id] : matches;
        });
      });
      setFieldValue("permissions", map);
      setPresetsOpen(false);
      setApplied(
        `Se marcaron los permisos de «${preset.label}». Revisa cada módulo y ajusta lo que haga falta.` +
          (skipped
            ? ` ${plural(skipped, "Quedó fuera 1 permiso que tú no tienes.", `Quedaron fuera ${skipped} permisos que tú no tienes.`)}`
            : ""),
      );
    },
    [lockedIds, permissionsByResource, setFieldValue],
  );

  const clearAll = useCallback(() => {
    // Los bloqueados no se pueden quitar: se quedan como estaban.
    const current = valuesRef.current.permissions || {};
    const map: Record<string, boolean> = {};
    lockedIds.forEach((id) => {
      if (current[id]) map[id] = true;
    });
    setFieldValue("permissions", map);
    setPresetsOpen(false);
    setApplied("Se quitaron todos los permisos. Marca en cada módulo lo que necesite.");
  }, [lockedIds, setFieldValue]);

  const setAllExpanded = useCallback(
    (value: boolean) => {
      const next: Record<string, boolean> = {};
      visibleKeys.forEach((key) => {
        next[key] = value;
      });
      setExpanded(next);
    },
    [visibleKeys],
  );

  // «Administrador del sistema» solo lo puede dar otro administrador del
  // sistema; en el detalle sale solo si el rol lo tiene.
  const showSystemAdmin =
    !!systemAdminPerm && (!!selectedMap[systemAdminPerm.id] || (isSystemAdmin && !readonly));
  const showScope = !!allLocationsPerm || showSystemAdmin;
  const canEdit = !readonly && !locked;
  // En el detalle, el buscador solo cuando hay muchos módulos con permisos.
  const showSearch = !readonly || query.length > 0 || visibleKeys.length > 6;

  return (
    <View onLayout={onLayout}>
      {systemRole && (
        <View style={styles.note}>
          <FormNote icon="shield-crown-outline">
            Es el rol del sistema: siempre tiene todos los permisos y no se puede cambiar.
          </FormNote>
        </View>
      )}
      {frozen && !systemRole && (
        <View style={styles.note}>
          <FormNote tone="warning" icon="lock-outline">
            {plural(
              lockedSelected,
              "Este rol tiene 1 permiso que tú no tienes, así que no puedes guardar cambios en él. Pide al administrador que lo edite.",
              `Este rol tiene ${lockedSelected} permisos que tú no tienes, así que no puedes guardar cambios en él. Pide al administrador que lo edite.`,
            )}
          </FormNote>
        </View>
      )}

      <FormInput
        name="name"
        label="Nombre"
        placeholder="Por ejemplo, Cajero de mostrador"
        maxLength={LIMITS.name}
        autoCapitalize="sentences"
        readonly={locked || undefined}
      />
      <FormInput
        name="description"
        label="Descripción"
        optional
        multiline
        numberOfLines={2}
        placeholder="Qué hace quien tiene este rol"
        maxLength={LIMITS.description}
        readonly={locked || undefined}
      />

      <FormSection
        title="Permisos"
        description={
          readonly
            ? `${selectedCount} de ${totalCount} ${plural(totalCount, "permiso", "permisos")}.`
            : `Lo que puede ver y hacer quien tenga este rol. Hay ${selectedCount} de ${totalCount} marcados.`
        }
        style={styles.sectionLast}
      >
        <View style={styles.blocks}>
          {canEdit && (
            <View style={styles.block}>
              <ListGroup>
                <ListRow
                  icon="clipboard-account-outline"
                  title="Usar una plantilla"
                  subtitle={
                    editing
                      ? "Cambia los permisos marcados por los de un puesto"
                      : "Marca los permisos de un puesto: encargado, cajero, producción…"
                  }
                  onPress={() => setPresetsOpen(true)}
                />
              </ListGroup>
              {!!applied && <FormNote>{applied}</FormNote>}
            </View>
          )}

          {showScope && (
            <View style={styles.block}>
              <ListSectionTitle title="Alcance" />
              <ListGroup>
                {allLocationsPerm && (
                  <ScopeRow
                    icon="store-marker-outline"
                    title="Todas las sucursales"
                    description={
                      readonly
                        ? selectedMap[allLocationsPerm.id]
                          ? "Entra y trabaja en cualquier sucursal y administra al personal de todas"
                          : "Solo entra a las sucursales que tenga asignadas"
                        : "Entra y trabaja en cualquier sucursal y administra al personal de todas"
                    }
                    value={!!selectedMap[allLocationsPerm.id]}
                    readonly={readonly}
                    disabled={locked || lockedIds.has(allLocationsPerm.id)}
                    locked={lockedIds.has(allLocationsPerm.id)}
                    onChange={(value) => setPermission(allLocationsPerm.id, value)}
                  />
                )}
                {showSystemAdmin && systemAdminPerm && (
                  <ScopeRow
                    icon="shield-crown-outline"
                    title="Administrador del sistema"
                    description="Puede todo en todas las empresas, también administrar a otros administradores"
                    value={!!selectedMap[systemAdminPerm.id]}
                    readonly={readonly}
                    disabled={locked || lockedIds.has(systemAdminPerm.id)}
                    locked={lockedIds.has(systemAdminPerm.id)}
                    danger
                    onChange={(value) => setPermission(systemAdminPerm.id, value)}
                  />
                )}
              </ListGroup>
              {canEdit && (
                <Text style={styles.hint}>
                  Sin «Todas las sucursales», cada persona solo entra a las sucursales que tenga asignadas.
                  {showSystemAdmin ? " «Administrador del sistema» es solo para el dueño del sistema." : ""}
                </Text>
              )}
            </View>
          )}

          {readonly && !anyModuleSelected ? (
            <ListGroup>
              <ListRow
                icon="shield-off-outline"
                title="Sin permisos en los módulos"
                subtitle="Quien tenga este rol no puede ver ni hacer nada en ellos."
                chevron={false}
              />
            </ListGroup>
          ) : (
            <>
              {showSearch && (
              <View style={styles.block}>
                <View style={styles.toolbar}>
                  <View style={styles.searchBox}>
                    <MaterialCommunityIcons name="magnify" size={18} color={colors.textMuted} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Buscar módulo"
                      placeholderTextColor={colors.textMuted}
                      style={styles.searchInput}
                      accessibilityLabel="Buscar módulo"
                    />
                    {query.length > 0 && (
                      <Pressable
                        onPress={() => setQuery("")}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Borrar búsqueda"
                      >
                        <MaterialCommunityIcons name="close" size={16} color={colors.textMuted} />
                      </Pressable>
                    )}
                  </View>
                  {!readonly && visibleKeys.length > 0 && (
                    <Pressable
                      onPress={() => setAllExpanded(!allExpanded)}
                      hitSlop={8}
                      accessibilityRole="button"
                      style={styles.expandAll}
                    >
                      <Text style={styles.link}>{allExpanded ? "Contraer todo" : "Expandir todo"}</Text>
                    </Pressable>
                  )}
                </View>
                {canEdit && lockedIds.size > 0 && (
                  <Text style={styles.hint}>
                    Los que tienen candado no los puedes dar ni quitar: tú no los tienes.
                  </Text>
                )}
              </View>
              )}

              {groups.length === 0 ? (
                <Text style={styles.empty}>Ningún módulo coincide con «{query.trim()}».</Text>
              ) : (
                groups.map((group) => (
                  <View key={group.title} style={styles.block}>
                    <ListSectionTitle title={group.title} />
                    <ListGroup>
                      {group.items.map((resource) => {
                        const perms = modulePermissions[resource.key] || [];
                        return (
                          <ModuleRow
                            key={resource.key}
                            resource={resource}
                            permissions={perms}
                            signature={perms.map((p) => (selectedMap[p.id] ? "1" : "0")).join("")}
                            lockedSignature={perms.map((p) => (lockedIds.has(p.id) ? "1" : "0")).join("")}
                            expanded={!readonly && !!expanded[resource.key]}
                            readonly={readonly}
                            frozen={locked}
                            columns={columns}
                            onToggleExpand={toggleExpand}
                            onSetModule={setModule}
                            onTogglePermission={togglePermission}
                          />
                        );
                      })}
                    </ListGroup>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </FormSection>

      <PresetSheet
        visible={presetsOpen}
        editing={editing}
        onDismiss={() => setPresetsOpen(false)}
        onApply={applyPreset}
        onClear={clearAll}
      />
    </View>
  );
}

// ===========================================================================
// Renglón de un módulo (memoizado). Solo se vuelve a pintar cuando cambia su
// propia selección (`signature`) o si está abierto, no en cada tecleo del
// nombre o la descripción del rol.
// ===========================================================================
interface ModuleRowProps {
  resource: ResourceItem;
  permissions: PermissionItem[];
  signature: string;
  /** "1" en la posición de cada permiso que quien edita no puede dar. */
  lockedSignature: string;
  expanded: boolean;
  readonly: boolean;
  /** El rol no se puede guardar: se ve pero no se cambia. */
  frozen: boolean;
  columns: number;
  onToggleExpand: (key: string) => void;
  onSetModule: (ids: number[], value: boolean) => void;
  onTogglePermission: (id: number) => void;
}

const ModuleRow = React.memo(function ModuleRow({
  resource,
  permissions,
  signature,
  lockedSignature,
  expanded,
  readonly,
  frozen,
  columns,
  onToggleExpand,
  onSetModule,
  onTogglePermission,
}: ModuleRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [highlighted, setHighlighted] = useState(false);

  const granted = permissions.filter((_, index) => signature[index] === "1");
  const total = permissions.length;
  const summary =
    granted.length === 0
      ? "Ninguno"
      : granted.length === total
        ? "Todos"
        : joinLabels(granted.map(actionLabel));
  // Abierto, las casillas ya dicen cuáles: arriba solo cuántos.
  const caption = expanded ? `${granted.length} de ${total} marcados` : summary;
  // «Marcar todos» marca lo que se puede dar; si eso ya está todo marcado,
  // desmarca (si no, con permisos bloqueados nunca se apagaría).
  const allGrantableOn = permissions.every(
    (_, index) => lockedSignature[index] === "1" || signature[index] === "1",
  );
  const editable = !readonly && !frozen;
  const ids = permissions.map((p) => p.id);

  return (
    <View>
      <Pressable
        onPress={readonly ? undefined : () => onToggleExpand(resource.key)}
        disabled={readonly}
        onHoverIn={() => setHighlighted(true)}
        onHoverOut={() => setHighlighted(false)}
        onPressIn={() => setHighlighted(true)}
        onPressOut={() => setHighlighted(false)}
        accessibilityRole={readonly ? undefined : "button"}
        accessibilityState={readonly ? undefined : { expanded }}
        accessibilityLabel={`${resource.label}: ${summary}`}
        style={[styles.moduleRow, !readonly && highlighted && styles.rowHighlight]}
      >
        <MaterialCommunityIcons
          name={(resource.icon as IconName) || "shape-outline"}
          size={20}
          color={colors.textSecondary}
        />
        <View style={styles.moduleBody}>
          <Text style={styles.moduleTitle}>{resource.label}</Text>
          <Text
            style={[styles.moduleSummary, granted.length === 0 && styles.muted]}
            numberOfLines={2}
          >
            {caption}
          </Text>
        </View>
        {!readonly && (
          <MaterialCommunityIcons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textMuted}
          />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.moduleDetail}>
          <View style={styles.moduleDetailHeader}>
            {!!resource.description && (
              <Text style={styles.moduleDescription}>{resource.description}</Text>
            )}
            {editable && (
              <Pressable
                onPress={() => onSetModule(ids, !allGrantableOn)}
                disabled={allGrantableOn && granted.length === 0}
                hitSlop={8}
                accessibilityRole="button"
                style={styles.moduleToggleAll}
              >
                <Text style={styles.link}>{allGrantableOn && granted.length > 0 ? "Quitar todos" : "Marcar todos"}</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.grid}>
            {permissions.map((perm, index) => (
              <PermissionToggle
                key={perm.id}
                label={actionLabel(perm)}
                active={signature[index] === "1"}
                locked={lockedSignature[index] === "1"}
                disabled={!editable}
                width={`${100 / columns}%`}
                onPress={() => onTogglePermission(perm.id)}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

// ===========================================================================
// Casilla de un permiso.
// ===========================================================================
function PermissionToggle({
  label,
  active,
  locked,
  disabled,
  width,
  onPress,
}: {
  label: string;
  active: boolean;
  /** Quien edita no tiene este permiso: no lo puede dar ni quitar. */
  locked: boolean;
  disabled: boolean;
  width: `${number}%`;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const inactive = disabled || locked;
  const color = locked
    ? active
      ? colors.textMuted
      : colors.border
    : active
      ? colors.primary
      : colors.borderStrong;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active, disabled: inactive }}
      accessibilityLabel={locked ? `${label}, no lo tienes` : label}
      style={[styles.toggle, { width }]}
    >
      <MaterialCommunityIcons
        name={active ? "checkbox-marked" : "checkbox-blank-outline"}
        size={20}
        color={color}
      />
      <Text style={[styles.toggleText, locked && styles.muted]}>{label}</Text>
      {locked && <MaterialCommunityIcons name="lock-outline" size={14} color={colors.textMuted} style={styles.toggleLock} />}
    </Pressable>
  );
}

// ===========================================================================
// Renglón de «Alcance»: título, una línea de qué hace y el interruptor (en
// solo lectura, Sí / No).
// ===========================================================================
function ScopeRow({
  icon,
  title,
  description,
  value,
  readonly,
  disabled,
  locked,
  danger,
  onChange,
}: {
  icon: IconName;
  title: string;
  description: string;
  value: boolean;
  readonly: boolean;
  disabled?: boolean;
  locked?: boolean;
  danger?: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const accent = danger ? colors.error : colors.primary;
  return (
    <ListRow
      icon={icon}
      iconColor={value ? accent : undefined}
      title={title}
      subtitle={description}
      meta={!readonly && locked ? "No lo puedes dar ni quitar: tú no lo tienes" : undefined}
      chevron={false}
      onPress={readonly || disabled ? undefined : () => onChange(!value)}
      accessibilityLabel={`${title}: ${value ? "sí" : "no"}`}
      trailing={
        readonly ? (
          <Text style={styles.scopeValue}>{value ? "Sí" : "No"}</Text>
        ) : (
          <Switch
            value={value}
            onValueChange={onChange}
            disabled={disabled}
            color={accent}
            accessibilityLabel={title}
          />
        )
      }
    />
  );
}

// ===========================================================================
// Plantillas por puesto: cada una con lo que marca (antes solo se leía al
// pasar el lector de pantalla).
// ===========================================================================
function PresetSheet({
  visible,
  editing,
  onDismiss,
  onApply,
  onClear,
}: {
  visible: boolean;
  editing: boolean;
  onDismiss: () => void;
  onApply: (preset: Preset) => void;
  onClear: () => void;
}) {
  const styles = useStyles();
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.sheet}>
        <Text style={styles.sheetTitle} accessibilityRole="header">
          Usar una plantilla
        </Text>
        <Text style={styles.sheetText}>
          {editing
            ? "Cambia los permisos marcados por los del puesto. Después ajustas lo que haga falta."
            : "Marca los permisos del puesto más parecido. Después ajustas lo que haga falta."}
        </Text>
        <ScrollView style={styles.sheetScroll}>
          <ListGroup>
            {PRESETS.map((preset) => (
              <ListRow
                key={preset.key}
                icon={preset.icon}
                title={preset.label}
                subtitle={preset.description}
                alignTop
                onPress={() => onApply(preset)}
              />
            ))}
          </ListGroup>
          <ListGroup style={styles.sheetGroup}>
            <ListRow
              icon="checkbox-blank-off-outline"
              title="Ninguno"
              subtitle="Quita todos los permisos para empezar de cero"
              onPress={onClear}
            />
          </ListGroup>
        </ScrollView>
        <Button mode="text" onPress={onDismiss}>
          Cerrar
        </Button>
      </Modal>
    </Portal>
  );
}

// ===========================================================================
// Estilos (siguen al tema).
// ===========================================================================
function useStyles() {
  const isWeb = Platform.OS === "web";
  return useThemedStyles((c) => ({
    note: { marginBottom: 18 },
    sectionLast: { marginBottom: 0 },
    blocks: { gap: 22 },
    block: { gap: 8 },
    hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
    empty: { fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: "center", paddingVertical: 16 },
    link: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.primary },
    muted: { color: c.textMuted },

    // Buscador
    toolbar: { flexDirection: "row", alignItems: "center", gap: 12 },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      height: 44,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      fontSize: 15,
      color: c.text,
      // RN web añade un contorno azul al enfocar.
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },
    expandAll: { paddingVertical: 4 },

    // Módulo
    moduleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    rowHighlight: { backgroundColor: c.surfaceMuted },
    moduleBody: { flex: 1, minWidth: 0 },
    moduleTitle: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: c.text },
    moduleSummary: { fontSize: 13, lineHeight: 18, color: c.textSecondary, marginTop: 2 },
    moduleDetail: {
      paddingLeft: 46,
      paddingRight: 14,
      paddingBottom: 12,
      gap: 8,
    },
    moduleDetailHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    moduleDescription: { flex: 1, fontSize: 13, lineHeight: 18, color: c.textMuted },
    moduleToggleAll: { marginLeft: "auto" },
    grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 2 },
    toggle: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingVertical: 7,
      paddingRight: 8,
    },
    toggleText: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: c.text },
    toggleLock: { marginTop: 3 },

    // Alcance
    scopeValue: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: c.text, paddingRight: 6 },

    // Plantillas
    sheet: {
      alignSelf: "center",
      width: "94%",
      maxWidth: 560,
      maxHeight: "86%",
      backgroundColor: c.background,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    sheetTitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: c.text },
    sheetText: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
    sheetScroll: { flexGrow: 0 },
    sheetGroup: { marginTop: 12 },
  }));
}
