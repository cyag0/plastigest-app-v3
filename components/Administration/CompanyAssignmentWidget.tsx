import { shortLocationName } from "@/utils/locations";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import axiosClient from "@/utils/axios";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Card, IconButton, Text } from "react-native-paper";
import AppSelect from "../Form/AppSelect/AppSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationRoleItem {
  location_id: number | undefined;
  role_id: number | undefined;
}

interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: LocationRoleItem[];
  onChange: (items: LocationRoleItem[]) => void;
  readonly?: boolean;
  /** Filter locations and roles by company */
  companyId?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationRoleList({ value, onChange, readonly, companyId }: Props) {
  const { selectedCompany } = useAuth();
  // Sin «Roles › Listar» el backend responde 403: los roles ni se piden.
  const canListRoles = useCan().can("roles_list");
  // En celular los dos selects lado a lado cortaban los nombres
  // ("Cocos Francisco Suc…", "Encargado …"): se apilan.
  const { width } = useWindowDimensions();
  const stacked = width < 600;
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  // Antes un error (p. ej. 403 sin «Roles › Listar») dejaba los selects
  // vacíos sin decir por qué.
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: any = { all: true };
    if (companyId) params.company_id = companyId;

    // silent: si fallan, el error se muestra aquí mismo (loadError), sin el
    // aviso global encima.
    Promise.allSettled([
      axiosClient.get("/auth/admin/locations", { params, silent: true }),
      canListRoles ? axiosClient.get("/auth/admin/roles", { params, silent: true }) : Promise.resolve(null),
    ])
      .then(([locResult, roleResult]) => {
        const problems: string[] = [];
        if (locResult.status === "fulfilled") {
          const locRes = locResult.value;
          const locs: any[] = Array.isArray(locRes.data) ? locRes.data : (locRes.data as any)?.data || [];
          setLocations(
            locs.map((l) => ({ value: String(l.id), label: shortLocationName(l.name, selectedCompany?.name) })),
          );
        } else {
          console.error(locResult.reason);
          problems.push("No se pudieron cargar las sucursales.");
        }
        if (!canListRoles) {
          problems.push("Para elegir roles necesitas el permiso «Roles › Listar».");
        } else if (roleResult.status === "fulfilled") {
          const roleRes = roleResult.value;
          const rls: any[] = Array.isArray(roleRes?.data) ? roleRes.data : (roleRes?.data as any)?.data || [];
          setRoles(rls.map((r) => ({ value: String(r.id), label: r.name })));
        } else {
          console.error(roleResult.reason);
          problems.push(
            (roleResult.reason as any)?.response?.status === 403
              ? "Para elegir roles necesitas el permiso «Roles › Listar»."
              : "No se pudieron cargar los roles.",
          );
        }
        setLoadError(problems.length ? problems.join(" ") : null);
      })
      .finally(() => setLoading(false));
  }, [companyId, selectedCompany?.name, canListRoles]);

  const add = () => onChange([...value, { location_id: undefined, role_id: undefined }]);

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const setLocation = (i: number, locationId: number | undefined) =>
    onChange(value.map((item, idx) => (idx === i ? { ...item, location_id: locationId } : item)));

  const setRole = (i: number, roleId: number | undefined) =>
    onChange(value.map((item, idx) => (idx === i ? { ...item, role_id: roleId } : item)));

  if (loading) {
    return (
      <Text variant="bodySmall" style={styles.loadingText}>
        Cargando sucursales y roles...
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {!!loadError && (
        <Text variant="bodySmall" style={styles.errorText}>
          {loadError}
        </Text>
      )}

      {value.length === 0 && (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodySmall" style={styles.emptyText}>
              Sin sucursales asignadas
            </Text>
          </Card.Content>
        </Card>
      )}

      {value.map((item, i) => {
        const locLabel = locations.find((l) => l.value === String(item.location_id))?.label;
        const roleLabel = roles.find((r) => r.value === String(item.role_id))?.label;

        return (
          <View key={i} style={styles.row}>
            {/* Row number + remove */}
            <View style={styles.rowHeader}>
              <Text variant="labelSmall" style={styles.rowLabel}>
                {locLabel && roleLabel
                  ? `${locLabel} · ${roleLabel}`
                  : locLabel
                  ? locLabel
                  : `Sucursal ${i + 1}`}
              </Text>
              {!readonly && (
                <IconButton
                  icon="close"
                  size={16}
                  iconColor={palette.error}
                  style={{ margin: 0 }}
                  onPress={() => remove(i)}
                />
              )}
            </View>

            <View style={[styles.selects, stacked && styles.selectsStacked]}>
              {/* Location */}
              <View style={[styles.selectLocation, stacked && styles.selectStacked]}>
                <Text variant="labelSmall" style={styles.fieldLabel}>
                  Sucursal
                </Text>
                <AppSelect
                  value={item.location_id}
                  onChange={(v) => setLocation(i, v as number | undefined)}
                  data={locations}
                  placeholder="Seleccionar"
                  disabled={readonly}
                />
              </View>

              {/* Role */}
              <View style={[styles.selectRole, stacked && styles.selectStacked]}>
                <Text variant="labelSmall" style={styles.fieldLabel}>
                  Rol
                </Text>
                <AppSelect
                  value={item.role_id}
                  onChange={(v) => setRole(i, v as number | undefined)}
                  data={roles}
                  placeholder="Sin rol"
                  disabled={readonly}
                />
              </View>
            </View>
          </View>
        );
      })}

      {!readonly && (
        <Button
          mode="outlined"
          icon="plus"
          onPress={add}
          style={styles.addButton}
          textColor={palette.primary}
        >
          Agregar sucursal
        </Button>
      )}
    </View>
  );
}

// Re-export old type alias for backwards compat (UserFormShared uses CompanyAssignment)
export type CompanyAssignment = LocationRoleItem;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 10,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 18,
  },
  emptyText: {
    color: palette.textSecondary,
    fontStyle: "italic",
  },
  row: {
    backgroundColor: palette.surface,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: palette.primary + "66",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rowLabel: {
    color: palette.primary,
    fontWeight: "600",
    flex: 1,
  },
  selects: {
    flexDirection: "row",
    gap: 10,
  },
  selectsStacked: {
    flexDirection: "column",
  },
  // Apilados, cada select toma el alto de su contenido (flex: 3/2 es para
  // repartir el ancho cuando van lado a lado).
  selectStacked: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
  selectLocation: {
    flex: 3,
  },
  selectRole: {
    flex: 2,
  },
  fieldLabel: {
    color: palette.textSecondary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  loadingText: {
    color: palette.textSecondary,
    fontStyle: "italic",
    paddingVertical: 12,
  },
  errorText: {
    color: palette.error,
  },
  addButton: {
    borderRadius: 10,
    borderColor: palette.primary,
    marginTop: 2,
  },
});

