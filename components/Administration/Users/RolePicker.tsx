import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useCompanyRoles } from "./useCompanyRoles";

export type { RoleOption } from "./useCompanyRoles";

interface Props {
  value?: number | null;
  onChange: (roleId: number) => void;
  disabled?: boolean;
}

/**
 * Rol de la persona en la sucursal: una tarjeta por rol de la empresa, con su
 * descripción. En celular se lee mejor que un select con nombres cortados.
 */
export default function RolePicker({ value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { roles: allRoles, error, forbidden } = useCompanyRoles();
  // El rol que tenía al abrir (el primero que llega: en el formulario los
  // valores cargan después de montar): si está desactivado se sigue mostrando.
  const [initialValue, setInitialValue] = useState(value);
  if (initialValue == null && value != null) setInitialValue(value);
  // Los roles desactivados no se ofrecen, salvo el que ya tiene.
  const roles = useMemo(
    () => allRoles?.filter((role) => role.is_active !== false || role.id === initialValue) ?? null,
    [allRoles, initialValue],
  );

  if (forbidden || error) {
    return (
      <Text style={styles.hint}>
        {forbidden || error?.response?.status === 403
          ? "Para elegir el rol necesitas el permiso «Roles › Listar». Pídeselo al administrador."
          : "No se pudieron cargar los roles."}
      </Text>
    );
  }

  if (roles === null) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: tokens.spacing[3] }} />;
  }

  if (roles.length === 0) {
    return (
      <Text style={styles.hint}>
        La empresa no tiene roles. Créalos en Administración › Roles y permisos.
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      {roles.map((role) => {
        const selected = role.id === value;
        // Un rol con permisos que el usuario no tiene no se puede asignar
        // (el backend responde 403): se ve, pero no se puede elegir.
        const locked = role.assignable === false && !selected;
        const optionDisabled = disabled || locked;
        return (
          <Pressable
            key={role.id}
            onPress={() => !optionDisabled && onChange(role.id)}
            disabled={optionDisabled}
            role="radio"
            aria-checked={selected}
            aria-disabled={optionDisabled}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              locked && { opacity: 0.55 },
              pressed && !optionDisabled && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons
              name={selected ? "radiobox-marked" : "radiobox-blank"}
              size={20}
              color={selected ? colors.primary : colors.textMuted}
            />
            <View style={styles.optionBody}>
              <Text style={[styles.optionTitle, selected && { color: colors.primary }]}>{role.name}</Text>
              {!!role.description && (
                <Text style={styles.optionDescription} numberOfLines={2}>
                  {role.description}
                </Text>
              )}
              {role.permissions_count !== undefined && (
                <Text style={styles.optionMeta}>
                  {role.permissions_count} {role.permissions_count === 1 ? "permiso" : "permisos"}
                </Text>
              )}
              {locked && (
                <Text style={styles.optionMeta}>
                  No puedes asignarlo: tiene permisos que tú no tienes.
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>["colors"]) => ({
  list: {
    gap: tokens.spacing[2],
  },
  option: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: tokens.spacing[3],
    padding: tokens.spacing[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  optionSelected: {
    borderColor: c.primary,
    backgroundColor: c.primarySoft,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionTitle: {
    ...tokens.typography.bodyMd,
    color: c.text,
  },
  optionDescription: {
    ...tokens.typography.caption,
    color: c.textSecondary,
  },
  optionMeta: {
    ...tokens.typography.caption,
    color: c.textMuted,
  },
  hint: {
    ...tokens.typography.bodySm,
    color: c.textSecondary,
    paddingVertical: tokens.spacing[2],
  },
});
