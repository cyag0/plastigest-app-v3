import AppForm, { AppFormRef, useAppForm } from "@/components/Form/AppForm/AppForm";
import { FormInput } from "@/components/Form/AppInput";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAsync } from "@/hooks/AHooks";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext } from "formik";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

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

// Plantillas rápidas: aplican un conjunto de acciones a TODOS los módulos de
// una sola vez para acelerar el llenado.
const PRESETS: {
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  match: (action: string) => boolean;
}[] = [
  { key: "all", label: "Acceso total", icon: "shield-check", match: () => true },
  {
    key: "operativo",
    label: "Operativo",
    icon: "briefcase-outline",
    match: (a) => ["create", "read", "update", "list", "view", "export"].includes(a),
  },
  {
    key: "lectura",
    label: "Solo lectura",
    icon: "eye-outline",
    match: (a) => ["read", "list", "view"].includes(a),
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
  return ACTION_LABELS[getAction(perm)] ?? perm.description ?? perm.name;
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
      setResources((data.resources as ResourceItem[]) || []);
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
}: {
  resources: ResourceItem[];
  permissionsByResource: Record<string, PermissionItem[]>;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { readonly } = useAppForm();

  const { values, setFieldValue } = useFormikContext<RoleValues>();
  // Ref con los valores más recientes para que los callbacks sean estables
  // (no se recrean en cada tecleo) sin perder acceso al estado actual.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Lista plana de permisos (para presets y contadores globales).
  const allPermissions = useMemo(
    () => Object.values(permissionsByResource).flat(),
    [permissionsByResource],
  );

  const selectedMap = values.permissions || {};
  const selectedCount = useMemo(
    () => allPermissions.filter((p) => selectedMap[p.id]).length,
    [allPermissions, selectedMap],
  );
  const totalCount = allPermissions.length;
  const progress = totalCount ? selectedCount / totalCount : 0;

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
  const togglePermission = useCallback(
    (id: number) => {
      const map = { ...(valuesRef.current.permissions || {}) };
      map[id] = !map[id];
      setFieldValue("permissions", map);
    },
    [setFieldValue],
  );

  const setModule = useCallback(
    (ids: number[], value: boolean) => {
      const map = { ...(valuesRef.current.permissions || {}) };
      ids.forEach((id) => {
        map[id] = value;
      });
      setFieldValue("permissions", map);
    },
    [setFieldValue],
  );

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const applyPreset = useCallback(
    (match: (action: string) => boolean) => {
      const map: Record<string, boolean> = {};
      allPermissions.forEach((p) => {
        map[p.id] = match(getAction(p));
      });
      setFieldValue("permissions", map);
    },
    [allPermissions, setFieldValue],
  );

  const clearAll = useCallback(() => {
    setFieldValue("permissions", {});
  }, [setFieldValue]);

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

        {!readonly && (
          <>
            <Text style={styles.presetsLabel}>Plantillas rápidas</Text>
            <View style={styles.presetsRow}>
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset.key}
                  style={styles.presetChip}
                  onPress={() => applyPreset(preset.match)}
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
          </>
        )}
      </View>

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
          const isExpanded = readonly
            ? signature.includes("1")
            : !!expanded[resource.key];

          return (
            <ModuleCard
              key={resource.key}
              resource={resource}
              permissions={perms}
              signature={signature}
              expanded={isExpanded}
              readonly={readonly}
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
  expanded: boolean;
  readonly: boolean;
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
  expanded,
  readonly,
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

        {!readonly && (
          <Pressable
            hitSlop={8}
            onPress={() => onSetModule(ids, !allOn)}
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
                  readonly={readonly}
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
  styles,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  readonly: boolean;
  styles: Styles;
  colors: ReturnType<typeof useTheme>["colors"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={readonly ? undefined : onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <MaterialCommunityIcons
        name={active ? "check" : "plus"}
        size={14}
        color={active ? colors.primary : colors.textMuted}
      />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
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
