import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params: any = { all: true };
    if (companyId) params.company_id = companyId;

    Promise.all([
      Services.admin.locations.index(params),
      Services.admin.roles.index(params),
    ])
      .then(([locRes, roleRes]) => {
        const locs: any[] = Array.isArray(locRes.data) ? locRes.data : locRes.data?.data || [];
        const rls: any[] = Array.isArray(roleRes.data) ? roleRes.data : roleRes.data?.data || [];
        setLocations(locs.map((l) => ({ value: String(l.id), label: l.name })));
        setRoles(rls.map((r) => ({ value: String(r.id), label: r.name })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

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

            <View style={styles.selects}>
              {/* Location */}
              <View style={styles.selectLocation}>
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
              <View style={styles.selectRole}>
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
  addButton: {
    borderRadius: 10,
    borderColor: palette.primary,
    marginTop: 2,
  },
});

