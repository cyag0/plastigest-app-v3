import AppChip from "@/components/App/Chip";
import palette from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type AdminCategory = "system" | "company" | "location" | "catalog";

export interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  color: string;
  category?: AdminCategory;
  requiredPermission?: string;
  badge?: string | number;
  badgeVariant?: "primary" | "success" | "warning" | "error" | "info" | "default";
}

export interface AdminSectionProps {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  options: AdminOption[];
}

/**
 * Seccion colapsable de opciones de administracion. Cada
 * seccion tiene un header con icono de categoria y una card
 * blanca con las opciones en formato de lista compacta
 * (estilo Linear/Vercel). Tonos suaves en vez de colores
 * saturados.
 */
export default function AdminSection({
  title,
  icon,
  options,
}: AdminSectionProps) {
  const router = useRouter();

  if (options.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={palette.textMuted}
        />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{options.length}</Text>
        </View>
      </View>

      {/* Options List */}
      <View style={styles.optionsCard}>
        {options.map((option, index) => (
          <React.Fragment key={option.id}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(option.route as any)}
              style={styles.optionItem}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: hexWithAlpha(option.color, 0.12) },
                ]}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={option.color}
                />
              </View>

              <View style={styles.optionBody}>
                <View style={styles.optionHeaderRow}>
                  <Text style={styles.optionTitle} numberOfLines={1}>
                    {option.title}
                  </Text>
                  {option.badge !== undefined && (
                    <AppChip
                      variant={option.badgeVariant ?? "primary"}
                      size="sm"
                    >
                      {option.badge}
                    </AppChip>
                  )}
                </View>
                <Text
                  style={styles.optionDescription}
                  numberOfLines={2}
                >
                  {option.description}
                </Text>
              </View>

              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={palette.textMuted}
                style={styles.chevron}
              />
            </TouchableOpacity>

            {index < options.length - 1 && (
              <View style={styles.divider} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

/**
 * Convierte un color hex (#RRGGBB) a rgba con alpha. Usado
 * para los icon-box tonales de las opciones de administracion.
 */
function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: tokens.spacing[5],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing[5],
    paddingTop: tokens.spacing[3],
    paddingBottom: tokens.spacing[2],
    gap: tokens.spacing[2],
  },
  sectionTitle: {
    ...tokens.typography.micro,
    color: palette.textMuted,
    flex: 1,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 6,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    ...tokens.typography.micro,
    color: palette.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  optionsCard: {
    marginHorizontal: tokens.spacing[5],
    backgroundColor: palette.surface,
    borderRadius: tokens.radius.lg,
    ...tokens.shadow.sm,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing[3] + 2,
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  optionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing[2],
  },
  optionTitle: {
    ...tokens.typography.bodyMd,
    color: palette.text,
    flex: 1,
    minWidth: 0,
  },
  optionDescription: {
    ...tokens.typography.caption,
    color: palette.textSecondary,
    lineHeight: 16,
  },
  chevron: {
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: tokens.spacing[4] + 40 + tokens.spacing[3],
  },
});
