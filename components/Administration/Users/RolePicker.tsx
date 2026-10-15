import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { listFrom } from "./userDisplay";

export interface RoleOption {
  id: number;
  name: string;
  description?: string | null;
  permissions_count?: number;
  is_active?: boolean;
}

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
  const [roles, setRoles] = useState<RoleOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Services.admin.roles
      .index({ all: true } as any)
      .then((response: any) => {
        if (cancelled) return;
        const list = listFrom<RoleOption>(response?.data);
        // Los roles desactivados no se ofrecen, salvo el que ya tiene.
        setRoles(list.filter((role) => role.is_active !== false || role.id === value));
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
    // Solo al montar: la lista de roles no cambia mientras se edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return <Text style={styles.hint}>No se pudieron cargar los roles.</Text>;
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
        return (
          <Pressable
            key={role.id}
            onPress={() => !disabled && onChange(role.id)}
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && !disabled && { opacity: 0.85 },
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
