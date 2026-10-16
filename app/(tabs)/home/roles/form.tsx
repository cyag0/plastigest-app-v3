import AppForm, { AppFormRef, useAppForm } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAsync } from "@/hooks/AHooks";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext } from "formik";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { ActivityIndicator, Switch } from "react-native-paper";

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
}

interface RoleProps {
  id?: number;
  readonly?: boolean;
}

// Etiquetas cortas para las acciones (lo que se muestra en cada chip).
const ACTION_LABELS: Record<string, string> = {
  create: "Crear",
  read: "Leer",
  update: "Actualizar",
  delete: "Eliminar",
  list: "Listar",
  export: "Exportar",
  import: "Importar",
  view: "Ver",
  manage: "Gestionar",
  admin: "Administrar",
};

// Permisos que amplían hasta dónde llega el rol. Se buscan por nombre (no por
// módulo) y ninguna plantilla de puesto los marca:
// - locations_all: entrar y operar en todas las sucursales de la empresa (y
//   administrar al personal de todas). Antes eso lo daba, sin decirlo,
//   «Ubicaciones › Listar».
// - system_admin: administrador del sistema (todas las empresas). Solo se da
//   a mano, ni siquiera con «Acceso total».
const ALL_LOCATIONS = "locations_all";
const SYSTEM_ADMIN = "system_admin";

// Etiqueta del chip de los permisos cuya acción no dice lo que hacen.
const PERMISSION_LABELS: Record<string, string> = {
  [ALL_LOCATIONS]: "Todas las sucursales",
  [SYSTEM_ADMIN]: "Administrador del sistema",
  sales_pos: "Punto de venta",
  sales_discount: "Precios y descuentos",
};

// Módulos que en la app se llaman distinto que en el backend.
const RESOURCE_OVERRIDES: Record<string, Partial<ResourceItem>> = {
  locations: {
    label: "Sucursales",
    description:
      "Datos de las sucursales. «Listar» solo muestra la lista; entrar y trabajar en todas las sucursales es «Todas las sucursales».",
  },
};

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

// Plantillas rápidas: marcan un conjunto de permisos de una sola vez para
// acelerar el llenado; luego se ajusta lo que haga falta.
const PRESETS: {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  match: (p: PermissionInfo) => boolean;
}[] = [
  {
    key: "all",
    label: "Acceso total",
    description:
      "Todos los permisos, en todas las sucursales. No lo hace administrador del sistema.",
    icon: "shield-check",
    match: (p) => p.name !== SYSTEM_ADMIN,
  },
  {
    key: "encargado",
    label: "Encargado de sucursal",
    description:
      "Todo lo de su sucursal: ventas y descuentos, caja y turnos, inventario y ajustes, compras, producción, transferencias y su personal. Sin otras sucursales ni cambios al catálogo.",
    icon: "account-tie",
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
      "Órdenes de producción, consultar fórmulas, productos y existencias, y pedir insumos por transferencia.",
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

// ===========================================================================
// Pantalla principal. Carga los permisos y monta el formulario. La lógica
// pesada vive en <PermissionsManager/>, que ya está dentro del contexto de
// Formik (AppForm) y por eso puede leer/escribir los valores de forma reactiva.
// ===========================================================================
export default function CreateRoleScreen(props: RoleProps) {
  const { colors } = useTheme();
  const [permissionsByResource, setPermissionsByResource] = useState<
    Record<string, PermissionItem[]>
  >({});
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const formRef = useRef<AppFormRef<RoleValues>>(null);

  const styles = useStyles();

  useAsync(async () => {
    try {
      setLoading(true);
      const data = await Services.admin.permissions.getByResource();
      setPermissionsByResource(
        (data.permissions_by_resource as Record<string, PermissionItem[]>) || {},
      );
      setResources(
        ((data.resources as ResourceItem[]) || []).map((r) => ({
          ...r,
          ...RESOURCE_OVERRIDES[r.key],
        })),
      );
    } catch (error) {
      console.log("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  });

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AppForm
      deletePermission="roles_delete"
      readonly={props.readonly}
      id={props.id}
      api={Services.admin.roles}
      ref={formRef}
      style={styles.screen}
      initialValues={{ permissions: {}, name: "", description: "" }}
    >
      <PermissionsManager
        resources={resources}
        permissionsByResource={permissionsByResource}
        editing={!!props.id}
      />
    </AppForm>
  );
}

// ===========================================================================
// Gestor de permisos. Vive dentro de AppForm/Formik.
// ===========================================================================
function PermissionsManager({
  resources,
  permissionsByResource,
  editing,
}: {
  resources: ResourceItem[];
  permissionsByResource: Record<string, PermissionItem[]>;
  editing: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { readonly } = useAppForm();
  const { permissions: myPermissions } = useAuth();

  const { values, setFieldValue } = useFormikContext<RoleValues>();
  // Ref con los valores más recientes para que los callbacks sean estables
  // (no se recrean en cada tecleo) sin perder acceso al estado actual.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Plantilla recién aplicada (para explicar qué marcó).
  const [appliedPreset, setAppliedPreset] = useState<{
    label: string;
    description: string;
    skipped: number;
  } | null>(null);

  // Lista plana de permisos (para presets y contadores globales).
  const allPermissions = useMemo(
    () => Object.values(permissionsByResource).flat(),
    [permissionsByResource],
  );

  // El backend no deja dar ni quitar a un rol permisos que uno no tiene
  // (403 "No puedes quitar permisos que tú no tienes."), salvo al
  // administrador del sistema: esos chips quedan con candado, marcados o no.
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
  const progress = totalCount ? selectedCount / totalCount : 0;
  // Permisos del rol que quien edita no tiene: con ellos el backend rechaza
  // el guardado completo (no se pueden conservar ni quitar), así que el rol
  // queda de solo lectura para él: plantillas, "Limpiar" y casillas apagadas.
  const lockedSelected = useMemo(
    () => allPermissions.filter((p) => selectedMap[p.id] && lockedIds.has(p.id)).length,
    [allPermissions, selectedMap, lockedIds],
  );
  const frozen = !readonly && lockedSelected > 0;

  // Módulos visibles según el buscador. En modo lectura solo se muestran los
  // que tienen al menos un permiso asignado (resumen de lo que el rol puede).
  const visibleResources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      const perms = permissionsByResource[r.key] || [];
      if (perms.length === 0) return false;
      if (readonly && !perms.some((p) => selectedMap[p.id])) return false;
      if (!q) return true;
      return r.label.toLowerCase().includes(q);
    });
  }, [resources, permissionsByResource, query, readonly, selectedMap]);

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
    (preset: (typeof PRESETS)[number]) => {
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
          const locked = lockedIds.has(p.id);
          if (matches && locked && !current[p.id]) skipped++;
          // Un permiso bloqueado se queda como estaba.
          map[p.id] = locked ? !!current[p.id] : matches;
        });
      });
      setFieldValue("permissions", map);
      setAppliedPreset({ label: preset.label, description: preset.description, skipped });
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
    setAppliedPreset(null);
  }, [lockedIds, setFieldValue]);

  const setAllExpanded = useCallback(
    (value: boolean) => {
      const next: Record<string, boolean> = {};
      visibleResources.forEach((r) => {
        next[r.key] = value;
      });
      setExpanded(next);
    },
    [visibleResources],
  );

  return (
    <View style={styles.content}>
      {/* --- Identidad del rol --- */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons
              name="shield-account"
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={styles.cardTitle}>Datos del rol</Text>
        </View>
        <FormInput name="name" label="Nombre del rol" required />
        <FormInput
          name="description"
          label="Descripción"
          multiline
          numberOfLines={2}
        />
      </View>

      {/* --- Resumen + progreso --- */}
      <View style={styles.card}>
        <View style={styles.summaryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Permisos</Text>
            <Text style={styles.summarySub}>
              {selectedCount} de {totalCount} permisos seleccionados
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{selectedCount}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        {!readonly && !frozen && (
          <>
            <Text style={styles.presetsLabel}>Plantillas rápidas</Text>
            <View style={styles.presetsRow}>
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset.key}
                  style={styles.presetChip}
                  onPress={() => applyPreset(preset)}
                  accessibilityHint={preset.description}
                >
                  <MaterialCommunityIcons
                    name={preset.icon}
                    size={15}
                    color={colors.primary}
                  />
                  <Text style={styles.presetChipText}>{preset.label}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.clearChip} onPress={clearAll}>
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={15}
                  color={colors.error}
                />
                <Text style={styles.clearChipText}>Limpiar</Text>
              </Pressable>
            </View>
            <Text style={styles.presetHint}>
              {appliedPreset
                ? `«${appliedPreset.label}»: ${appliedPreset.description} Ajusta lo que haga falta.`
                : editing
                  ? "Una plantilla reemplaza los permisos marcados; luego ajusta lo que haga falta."
                  : "Elige la plantilla más parecida al puesto y luego ajusta los permisos."}
            </Text>
            {!!appliedPreset?.skipped && (
              <Text style={styles.presetHint}>
                {appliedPreset.skipped === 1
                  ? "Quedó fuera 1 permiso que tú no tienes."
                  : `Quedaron fuera ${appliedPreset.skipped} permisos que tú no tienes.`}
              </Text>
            )}
          </>
        )}

        {!readonly && !isSystemAdmin && !frozen && (
          <Text style={styles.presetHint}>
            Solo puedes dar o quitar permisos que tú tienes; los demás aparecen con candado.
          </Text>
        )}
        {frozen && (
          <View style={styles.warningBox}>
            <MaterialCommunityIcons name="lock-outline" size={18} color={colors.warning} />
            <Text style={styles.warningText}>
              {lockedSelected === 1
                ? "Este rol tiene 1 permiso que tú no tienes: no puedes cambiarlo ni quitarlo, así que no puedes guardar cambios en este rol. Pide al administrador que lo edite."
                : `Este rol tiene ${lockedSelected} permisos que tú no tienes: no puedes cambiarlos ni quitarlos, así que no puedes guardar cambios en este rol. Pide al administrador que lo edite.`}
            </Text>
          </View>
        )}
      </View>

      {/* --- Alcance: todas las sucursales / administrador del sistema --- */}
      {(allLocationsPerm || (systemAdminPerm && (isSystemAdmin || selectedMap[systemAdminPerm.id]))) && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="store-marker-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Alcance</Text>
          </View>
          {allLocationsPerm && (
            <ScopeRow
              title="Acceso a todas las sucursales"
              description={
                readonly
                  ? selectedMap[allLocationsPerm.id]
                    ? "Quien tenga este rol entra y trabaja en cualquier sucursal de la empresa y administra al personal de todas."
                    : "Quien tenga este rol solo entra a las sucursales que tenga asignadas."
                  : "Entra y trabaja en cualquier sucursal de la empresa y administra al personal de todas. Sin esto, cada persona solo entra a las sucursales que tenga asignadas."
              }
              value={!!selectedMap[allLocationsPerm.id]}
              disabled={readonly || frozen || lockedIds.has(allLocationsPerm.id)}
              onChange={(value) => setPermission(allLocationsPerm.id, value)}
              styles={styles}
              colors={colors}
            />
          )}
          {systemAdminPerm && (isSystemAdmin || selectedMap[systemAdminPerm.id]) && (
            <ScopeRow
              title="Administrador del sistema"
              description="Puede todo en todas las empresas, también administrar a otros administradores. Solo para el dueño del sistema."
              value={!!selectedMap[systemAdminPerm.id]}
              disabled={readonly || frozen || lockedIds.has(systemAdminPerm.id)}
              onChange={(value) => setPermission(systemAdminPerm.id, value)}
              danger
              divider={!!allLocationsPerm}
              styles={styles}
              colors={colors}
            />
          )}
        </View>
      )}

      {/* --- Buscador + expandir/contraer --- */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons
            name="magnify"
            size={18}
            color={colors.textMuted}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar módulo..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </View>
        {!readonly && (
          <Pressable
            style={styles.expandToggle}
            onPress={() => setAllExpanded(!visibleResources.every((r) => expanded[r.key]))}
          >
            <MaterialCommunityIcons
              name="unfold-more-horizontal"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.expandToggleText}>Expandir</Text>
          </Pressable>
        )}
      </View>

      {/* --- Lista de módulos --- */}
      {visibleResources.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="shield-search"
            size={32}
            color={colors.textMuted}
          />
          <Text style={styles.emptyText}>
            {readonly
              ? "Este rol no tiene permisos asignados"
              : "No se encontraron módulos"}
          </Text>
        </View>
      ) : (
        visibleResources.map((resource) => {
          const perms = permissionsByResource[resource.key] || [];
          const signature = perms
            .map((p) => (selectedMap[p.id] ? "1" : "0"))
            .join("");
          const lockedSignature = perms
            .map((p) => (lockedIds.has(p.id) ? "1" : "0"))
            .join("");
          const isExpanded = readonly
            ? signature.includes("1")
            : !!expanded[resource.key];

          return (
            <ModuleCard
              key={resource.key}
              resource={resource}
              permissions={perms}
              signature={signature}
              lockedSignature={lockedSignature}
              expanded={isExpanded}
              readonly={readonly}
              frozen={frozen}
              styles={styles}
              colors={colors}
              onToggleExpand={toggleExpand}
              onSetModule={setModule}
              onTogglePermission={togglePermission}
            />
          );
        })
      )}
    </View>
  );
}

// ===========================================================================
// Tarjeta de módulo (memoizada). Solo se re-renderiza cuando cambia su propia
// selección (`signature`) o su estado de expansión, no en cada tecleo del
// nombre/descripción del rol.
// ===========================================================================
type Styles = ReturnType<typeof useStyles>;

interface ModuleCardProps {
  resource: ResourceItem;
  permissions: PermissionItem[];
  signature: string;
  /** "1" en la posición de cada permiso que quien edita no puede dar. */
  lockedSignature: string;
  expanded: boolean;
  readonly: boolean;
  /** El rol tiene permisos que quien edita no tiene: se ve pero no se cambia. */
  frozen: boolean;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
  onToggleExpand: (key: string) => void;
  onSetModule: (ids: number[], value: boolean) => void;
  onTogglePermission: (id: number) => void;
}

const ModuleCard = React.memo(function ModuleCard({
  resource,
  permissions,
  signature,
  lockedSignature,
  expanded,
  readonly,
  frozen,
  styles,
  colors,
  onToggleExpand,
  onSetModule,
  onTogglePermission,
}: ModuleCardProps) {
  const total = permissions.length;
  const selected = (signature.match(/1/g) || []).length;
  const allOn = selected === total && total > 0;
  const state: "checked" | "partial" | "unchecked" =
    allOn ? "checked" : selected > 0 ? "partial" : "unchecked";
  // La casilla del módulo marca lo que se puede dar; si eso ya está todo
  // marcado, desmarca (si no, con permisos bloqueados nunca se apagaría).
  const allGrantableOn = permissions.every(
    (_, index) => lockedSignature[index] === "1" || signature[index] === "1",
  );

  const ids = permissions.map((p) => p.id);

  return (
    <View style={styles.moduleCard}>
      <Pressable
        style={styles.moduleHeader}
        onPress={() => onToggleExpand(resource.key)}
      >
        <View
          style={[
            styles.moduleIconWrap,
            selected > 0 && styles.moduleIconWrapActive,
          ]}
        >
          <MaterialCommunityIcons
            name={resource.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={20}
            color={selected > 0 ? colors.primary : colors.textSecondary}
          />
        </View>

        <View style={styles.moduleHeaderText}>
          <Text style={styles.moduleTitle}>{resource.label}</Text>
          <Text style={styles.moduleMeta}>
            {selected > 0
              ? `${selected} de ${total} permisos`
              : `${total} permisos disponibles`}
          </Text>
        </View>

        {!readonly && !frozen && (
          <Pressable
            hitSlop={8}
            onPress={() => onSetModule(ids, !allGrantableOn)}
            disabled={allGrantableOn && selected === 0}
            style={styles.triBox}
          >
            <MaterialCommunityIcons
              name={
                state === "checked"
                  ? "checkbox-marked"
                  : state === "partial"
                    ? "minus-box"
                    : "checkbox-blank-outline"
              }
              size={24}
              color={state === "unchecked" ? colors.borderStrong : colors.primary}
            />
          </Pressable>
        )}

        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={colors.textMuted}
        />
      </Pressable>

      {expanded && (
        <View style={styles.moduleBody}>
          {!readonly && (
            <Text style={styles.moduleDesc}>{resource.description}</Text>
          )}
          <View style={styles.chipsWrap}>
            {permissions.map((perm, index) => {
              const active = signature[index] === "1";
              // En modo lectura solo mostramos los permisos concedidos.
              if (readonly && !active) return null;
              return (
                <ActionChip
                  key={perm.id}
                  label={actionLabel(perm)}
                  active={active}
                  readonly={readonly || frozen}
                  locked={lockedSignature[index] === "1"}
                  scope={perm.name === ALL_LOCATIONS || perm.name === SYSTEM_ADMIN}
                  styles={styles}
                  colors={colors}
                  onPress={() => onTogglePermission(perm.id)}
                />
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

// ===========================================================================
// Chip seleccionable de acción.
// ===========================================================================
function ActionChip({
  label,
  active,
  readonly,
  locked,
  scope,
  styles,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  readonly: boolean;
  /** Quien edita no tiene este permiso: no lo puede dar. */
  locked?: boolean;
  /** Amplía el alcance del rol (todas las sucursales, admin del sistema). */
  scope?: boolean;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: () => void;
}) {
  const activeColor = scope ? colors.warning : colors.primary;
  return (
    <Pressable
      onPress={readonly || locked ? undefined : onPress}
      disabled={readonly || locked}
      accessibilityState={{ checked: active, disabled: readonly || locked }}
      style={[
        styles.chip,
        active && (scope ? styles.chipScopeActive : styles.chipActive),
        locked && styles.chipLocked,
      ]}
    >
      <MaterialCommunityIcons
        name={locked ? "lock-outline" : active ? "check" : "plus"}
        size={14}
        color={active ? activeColor : colors.textMuted}
      />
      <Text
        style={[
          styles.chipText,
          active && styles.chipTextActive,
          active && scope && { color: colors.warning },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ===========================================================================
// Renglón de la tarjeta «Alcance»: título, explicación y un switch.
// ===========================================================================
function ScopeRow({
  title,
  description,
  value,
  disabled,
  danger,
  divider,
  onChange,
  styles,
  colors,
}: {
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  onChange: (value: boolean) => void;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={[styles.scopeRow, divider && styles.scopeDivider]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.scopeTitle, danger && value && { color: colors.error }]}>
          {title}
        </Text>
        <Text style={styles.scopeDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        color={danger ? colors.error : colors.warning}
        accessibilityLabel={title}
      />
    </View>
  );
}

// ===========================================================================
// Estilos (reactivos al tema).
// ===========================================================================
function useStyles() {
  const isWeb = Platform.OS === "web";
  return useThemedStyles((c) => ({
    screen: {
      backgroundColor: c.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      gap: tokens.spacing[4],
    },

    // Cards genéricas (identidad + resumen)
    card: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: tokens.spacing[4],
      ...tokens.shadow.xs,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      marginBottom: tokens.spacing[3],
    },
    cardIcon: {
      width: 34,
      height: 34,
      borderRadius: tokens.radius.md,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: {
      ...tokens.typography.h3,
      color: c.text,
    },

    // Resumen
    summaryHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
    },
    summarySub: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
      marginTop: 2,
    },
    countBadge: {
      minWidth: 40,
      height: 40,
      paddingHorizontal: tokens.spacing[2],
      borderRadius: tokens.radius.full,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    countBadgeText: {
      ...tokens.typography.h3,
      color: c.primaryForeground,
    },
    progressTrack: {
      height: 6,
      borderRadius: tokens.radius.full,
      backgroundColor: c.surfaceMuted,
      overflow: "hidden",
      marginTop: tokens.spacing[3],
    },
    progressFill: {
      height: "100%",
      borderRadius: tokens.radius.full,
      backgroundColor: c.primary,
    },

    // Plantillas
    presetsLabel: {
      ...tokens.typography.micro,
      color: c.textMuted,
      textTransform: "uppercase",
      marginTop: tokens.spacing[4],
      marginBottom: tokens.spacing[2],
    },
    presetsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[2],
    },
    presetChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: tokens.spacing[2],
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.full,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoft,
    },
    presetChipText: {
      ...tokens.typography.bodySm,
      fontWeight: "600",
      color: c.primary,
    },
    clearChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: tokens.spacing[2],
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    clearChipText: {
      ...tokens.typography.bodySm,
      fontWeight: "600",
      color: c.error,
    },
    presetHint: {
      ...tokens.typography.caption,
      color: c.textSecondary,
      marginTop: tokens.spacing[2],
    },
    warningBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: tokens.spacing[2],
      marginTop: tokens.spacing[3],
      padding: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      backgroundColor: c.warningSoft,
    },
    warningText: {
      ...tokens.typography.bodySm,
      color: c.text,
      flex: 1,
    },

    // Alcance
    scopeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      paddingVertical: tokens.spacing[2],
    },
    scopeDivider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: tokens.spacing[2],
      paddingTop: tokens.spacing[3],
    },
    scopeTitle: {
      ...tokens.typography.bodyMd,
      fontWeight: "600",
      color: c.text,
    },
    scopeDescription: {
      ...tokens.typography.caption,
      color: c.textSecondary,
      marginTop: 2,
    },

    // Toolbar (buscador)
    toolbar: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
    },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      height: 44,
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: {
      flex: 1,
      ...tokens.typography.body,
      color: c.text,
      // RN web añade un outline azul por defecto al enfocar
      ...(isWeb ? ({ outlineStyle: "none" } as any) : {}),
    },
    expandToggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 44,
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    expandToggleText: {
      ...tokens.typography.bodySm,
      fontWeight: "600",
      color: c.textSecondary,
    },

    // Módulo
    moduleCard: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    moduleHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      padding: tokens.spacing[3],
    },
    moduleIconWrap: {
      width: 40,
      height: 40,
      borderRadius: tokens.radius.md,
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    moduleIconWrapActive: {
      backgroundColor: c.primarySoft,
    },
    moduleHeaderText: {
      flex: 1,
    },
    moduleTitle: {
      ...tokens.typography.bodyMd,
      fontWeight: "600",
      color: c.text,
    },
    moduleMeta: {
      ...tokens.typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    triBox: {
      padding: 2,
    },
    moduleBody: {
      paddingHorizontal: tokens.spacing[3],
      paddingBottom: tokens.spacing[3],
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: tokens.spacing[3],
    },
    moduleDesc: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
      marginBottom: tokens.spacing[3],
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[2],
    },

    // Chips de acción
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: tokens.spacing[3],
      borderRadius: tokens.radius.full,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    chipActive: {
      borderColor: c.primary,
      backgroundColor: c.primarySoft,
    },
    chipScopeActive: {
      borderColor: c.warning,
      backgroundColor: c.warningSoft,
    },
    chipLocked: {
      opacity: 0.55,
      borderStyle: "dashed",
    },
    chipText: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
    },
    chipTextActive: {
      color: c.primary,
      fontWeight: "600",
    },

    // Vacío
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      gap: tokens.spacing[2],
      paddingVertical: tokens.spacing[8],
    },
    emptyText: {
      ...tokens.typography.body,
      color: c.textMuted,
    },
  }));
}
