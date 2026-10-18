import FormNote from "@/components/Auth/FormNote";
import { ListGroup, ListGroupSkeleton, ListRow } from "@/components/App/ListGroup";
import { shortLocationName } from "@/utils/locations";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import axiosClient from "@/utils/axios";
import React, { useEffect, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { IconButton } from "react-native-paper";
import AppSelect from "../Form/AppSelect/AppSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocationRoleItem {
  location_id: number | undefined;
  role_id: number | undefined;
  /**
   * Nombres con los que llegó del servidor: si la sucursal o el rol no están
   * en las listas (el rol del sistema, una sucursal de otra empresa), se
   * muestran igual en lugar de «Sin rol» o «Elige la sucursal».
   */
  location_name?: string | null;
  role_name?: string | null;
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

/**
 * Sucursales de un usuario y su rol en cada una (formulario de usuario en la
 * empresa). Un renglón por sucursal dentro de una sola superficie, como las
 * listas de Inicio: la sucursal, el rol y quitar; al final «Agregar
 * sucursal». Antes cada una era una tarjeta con barra de color al costado.
 *
 * Una sucursal elegida en un renglón ya no se ofrece en los demás (el
 * servidor se quedaba con una sola y el rol de la otra se perdía).
 */
export default function LocationRoleList({ value, onChange, readonly, companyId }: Props) {
  const { selectedCompany } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Sin «Roles › Listar» el backend responde 403: los roles ni se piden.
  const canListRoles = useCan().can("roles_list");
  // En celular los dos selects lado a lado cortaban los nombres
  // ("Cocos Francisco Suc…", "Encargado …"): se apilan.
  const { width } = useWindowDimensions();
  const stacked = width < 600;
  const [locations, setLocations] = useState<SelectOption[]>([]);
  const [roles, setRoles] = useState<SelectOption[]>([]);
  // Empieza cargando: el efecto pide las sucursales y los roles al montar.
  const [loading, setLoading] = useState(true);
  // Antes un error (p. ej. 403 sin «Roles › Listar») dejaba los selects
  // vacíos sin decir por qué.
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
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

  /** Las sucursales que se pueden elegir en un renglón: sin las de los demás. */
  const locationOptions = (i: number) => {
    const item = value[i];
    const taken = new Set(
      value
        .filter((other, idx) => idx !== i && other.location_id != null)
        .map((other) => String(other.location_id)),
    );
    const options = locations.filter((option) => !taken.has(option.value));
    return withCurrent(
      options,
      item.location_id,
      item.location_name ? shortLocationName(item.location_name, selectedCompany?.name) : null,
    );
  };

  /** Los roles de la empresa, más el que ya tiene si no es uno de ellos. */
  const roleOptions = (item: LocationRoleItem) => withCurrent(roles, item.role_id, item.role_name);

  if (loading) {
    return <ListGroupSkeleton rows={Math.max(1, Math.min(value.length, 3))} />;
  }

  // Con todas las sucursales ya asignadas no hay más que agregar.
  const canAdd = !readonly && locations.length > 0 && value.length < locations.length;

  return (
    <View style={styles.container}>
      {!!loadError && <FormNote tone="warning">{loadError}</FormNote>}

      <ListGroup inset={14}>
        {value.length === 0 && (
          <ListRow
            icon="store-off-outline"
            iconColor={colors.warning}
            title="Sin sucursales"
            subtitle="No puede entrar a ninguna hasta que le agregues una."
            chevron={false}
          />
        )}

        {value.map((item, i) => {
          const locLabel = locations.find((l) => l.value === String(item.location_id))?.label;
          return (
            <View key={i} style={[styles.row, !stacked && styles.rowCentered]}>
              <View style={[styles.selects, stacked && styles.selectsStacked]}>
                <View style={[styles.selectLocation, stacked && styles.selectStacked]}>
                  <AppSelect
                    value={item.location_id}
                    onChange={(v) => setLocation(i, v as number | undefined)}
                    data={locationOptions(i)}
                    placeholder="Elige la sucursal"
                    disabled={readonly}
                  />
                </View>
                <View style={[styles.selectRole, stacked && styles.selectStacked]}>
                  <AppSelect
                    value={item.role_id}
                    onChange={(v) => setRole(i, v as number | undefined)}
                    data={roleOptions(item)}
                    placeholder="Sin rol"
                    disabled={readonly}
                  />
                </View>
              </View>
              {!readonly && (
                <IconButton
                  icon="close"
                  size={18}
                  iconColor={colors.textMuted}
                  style={[styles.remove, !stacked && styles.removeCentered]}
                  onPress={() => remove(i)}
                  accessibilityLabel={`Quitar ${locLabel ?? "esta sucursal"}`}
                />
              )}
            </View>
          );
        })}

        {canAdd && (
          <ListRow icon="plus" iconColor={colors.primary} title="Agregar sucursal" onPress={add} chevron={false} />
        )}
      </ListGroup>
    </View>
  );
}

/** Agrega a las opciones el valor actual cuando no viene en ellas. */
function withCurrent(
  options: SelectOption[],
  id: number | string | undefined,
  label: string | null | undefined,
): SelectOption[] {
  if (id == null || !label || options.some((option) => option.value === String(id))) return options;
  return [...options, { value: String(id), label }];
}

// Re-export old type alias for backwards compat (UserFormShared uses CompanyAssignment)
export type CompanyAssignment = LocationRoleItem;

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = themedStyles(() => ({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 10,
  },
  rowCentered: {
    alignItems: "center",
  },
  selects: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 10,
  },
  selectsStacked: {
    flexDirection: "column",
    gap: 8,
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
    minWidth: 0,
  },
  selectRole: {
    flex: 2,
    minWidth: 0,
  },
  remove: {
    margin: 0,
    marginTop: 4,
  },
  removeCentered: {
    marginTop: 0,
  },
}));
