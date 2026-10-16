import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import AppBar from "@/components/App/AppBar";
import SectionHeader from "@/components/App/SectionHeader";
import { notificationPreferencesRoute } from "@/components/Notifications/notificationLinks";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, ThemePreference } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { getAppVersionLabel } from "@/utils/appVersion";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type DensityPreference = "compact" | "normal" | "comfortable";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    value: "light",
    label: "Claro",
    description: "Fondo blanco, ideal para el día",
    icon: "white-balance-sunny",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Reduce el cansancio visual de noche",
    icon: "weather-night",
  },
  {
    value: "system",
    label: "Sistema",
    description: "Sigue el ajuste de tu dispositivo",
    icon: "cellphone-cog",
  },
];

const DENSITY_OPTIONS: {
  value: DensityPreference;
  label: string;
  description: string;
  lineCount: number;
  lineHeight: number;
}[] = [
  {
    value: "compact",
    label: "Compacto",
    description: "Más información",
    lineCount: 4,
    lineHeight: 6,
  },
  {
    value: "normal",
    label: "Normal",
    description: "Equilibrado",
    lineCount: 3,
    lineHeight: 8,
  },
  {
    value: "comfortable",
    label: "Espacioso",
    description: "Más aire y tipografía grande",
    lineCount: 2,
    lineHeight: 10,
  },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { location } = useAuth();
  // Quien no entra a todas las sucursales abre las de su sucursal.
  const allLocations = useAllLocationsAccess();
  // Preferencias de notificaciones: pide notifications_list (mapa central).
  const { canAccessRoute } = useCan();
  const notificationPrefsRoute = notificationPreferencesRoute(allLocations, !!location);
  const showNotificationPrefs = canAccessRoute(notificationPrefsRoute);
  const alerts = useAlerts();
  const { preference, mode, colors, setPreference } = useTheme();

  // Preferencias locales (aun no persistidas en backend)
  const [density, setDensity] = useState<DensityPreference>("normal");
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(false);

  const handleThemeChange = async (value: ThemePreference) => {
    await setPreference(value);
    alerts.success(
      value === "system"
        ? "Tema automático activado"
        : value === "dark"
          ? "Modo oscuro activado"
          : "Modo claro activado",
    );
  };

  const appVersion = getAppVersionLabel();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <AppBar title="Preferencias" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ============== TEMA ============== */}
        <View style={styles.section}>
          <SectionHeader
            title="Apariencia"
            badge={mode === "dark" ? "Oscuro" : "Claro"}
          />

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {THEME_OPTIONS.map((opt, idx) => {
              const selected = preference === opt.value;
              return (
                <View key={opt.value}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleThemeChange(opt.value)}
                    style={styles.optionRow}
                  >
                    <View
                      style={[
                        styles.optionIconBox,
                        {
                          backgroundColor: selected
                            ? colors.primarySoft
                            : colors.surfaceMuted,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={opt.icon}
                        size={18}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.optionBody}>
                      <View style={styles.optionTitleRow}>
                        <Text
                          style={[
                            styles.optionTitle,
                            { color: colors.text },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {selected && (
                          <MaterialCommunityIcons
                            name="check-circle"
                            size={16}
                            color={colors.primary}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {opt.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {idx < THEME_OPTIONS.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ============== DENSIDAD ============== */}
        <View style={styles.section}>
          <SectionHeader title="Densidad" />
          <View style={styles.densityGrid}>
            {DENSITY_OPTIONS.map((opt) => {
              const selected = density === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  onPress={() => setDensity(opt.value)}
                  style={[
                    styles.densityCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected
                        ? colors.primary
                        : colors.border,
                    },
                    tokens.shadow.sm,
                  ]}
                >
                  <View style={styles.densityPreview}>
                    {Array.from({ length: opt.lineCount }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.densityLine,
                          {
                            backgroundColor: selected
                              ? colors.primarySoft
                              : colors.surfaceMuted,
                            height: opt.lineHeight,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.densityLabel,
                      {
                        color: selected ? colors.primary : colors.text,
                        fontWeight: selected ? "600" : "500",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text
                    style={[
                      styles.densityDescription,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {opt.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ============== COMPORTAMIENTO ============== */}
        <View style={styles.section}>
          <SectionHeader title="Comportamiento" />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <SettingRow
              icon="vibrate"
              label="Vibración"
              description="Respuesta haptica al tocar botones"
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
            />
            <DividerLine />
            <SettingRow
              icon="animation-play-outline"
              label="Animaciones"
              description="Transiciones suaves en toda la app"
              value={animationsEnabled}
              onValueChange={setAnimationsEnabled}
            />
            <DividerLine />
            <SettingRow
              icon="volume-high"
              label="Sonidos"
              description="Efectos de sonido del sistema"
              value={soundsEnabled}
              onValueChange={setSoundsEnabled}
            />
            <DividerLine />
            <SettingRow
              icon="dock-left"
              label="Sidebar compacto"
              description="Reduce el tamaño de los items del menú lateral"
              value={compactSidebar}
              onValueChange={setCompactSidebar}
            />
          </View>
        </View>

        {/* ============== NOTIFICACIONES ============== */}
        {showNotificationPrefs && (
          <View style={styles.section}>
            <SectionHeader title="Notificaciones" />
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(notificationPrefsRoute as any)}
              style={[styles.linkCard, { backgroundColor: colors.surface }]}
            >
              <View
                style={[
                  styles.optionIconBox,
                  { backgroundColor: colors.warningSoft },
                ]}
              >
                <MaterialCommunityIcons
                  name="bell-cog-outline"
                  size={18}
                  color={colors.warning}
                />
              </View>
              <View style={styles.optionBody}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Preferencias de notificaciones
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Configura qué eventos generan alertas y a quién
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ============== ACERCA DE ============== */}
        <View style={styles.section}>
          <SectionHeader title="Acerca de" />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <AboutRow
              icon="information-outline"
              label="GCStock"
              value={`v${appVersion}`}
            />
            <DividerLine />
            <AboutRow
              icon="translate"
              label="Idioma"
              value="Español (es-MX)"
            />
            <DividerLine />
            <AboutRow
              icon="earth"
              label="Zona horaria"
              value={
                Intl.DateTimeFormat().resolvedOptions().timeZone || "Auto"
              }
            />
            <DividerLine />
            <AboutRow
              icon="palette-outline"
              label="Tema activo"
              value={mode === "dark" ? "Oscuro" : "Claro"}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Hecho con pasión para la gestión de tu negocio
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============== SUBCOMPONENTES ==============

function DividerLine() {
  const { colors } = useTheme();
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.settingRow}>
      <View
        style={[
          styles.optionIconBox,
          { backgroundColor: colors.surfaceMuted },
        ]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={18}
          color={colors.textSecondary}
        />
      </View>
      <View style={styles.optionBody}>
        <Text style={[styles.optionTitle, { color: colors.text }]}>
          {label}
        </Text>
        <Text
          style={[styles.optionDescription, { color: colors.textSecondary }]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={
          Platform.OS === "android"
            ? colors.surface
            : value
              ? colors.surface
              : undefined
        }
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function AboutRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.aboutRow}>
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={colors.textMuted}
      />
      <Text style={[styles.aboutLabel, { color: colors.text }]}>
        {label}
      </Text>
      <Text
        style={[styles.aboutValue, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ============== STYLES ==============
// Solo estructurales. Los colores se aplican inline desde el theme.

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: tokens.spacing[10],
  },

  // --- Sections ---
  section: {
    paddingHorizontal: tokens.spacing[5],
    marginBottom: tokens.spacing[5],
  },
  card: {
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: tokens.spacing[4],
    borderRadius: tokens.radius.lg,
    gap: tokens.spacing[3],
    ...tokens.shadow.sm,
  },
  divider: {
    height: 1,
    marginLeft: tokens.spacing[4] + 40 + tokens.spacing[3],
  },

  // --- Option rows ---
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing[3] + 2,
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },
  optionIconBox: {
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
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing[2],
  },
  optionTitle: {
    ...tokens.typography.bodyMd,
  },
  optionDescription: {
    ...tokens.typography.caption,
    lineHeight: 16,
  },

  // --- Density grid ---
  densityGrid: {
    flexDirection: "row",
    gap: tokens.spacing[3],
  },
  densityCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing[3],
    gap: tokens.spacing[2],
    minWidth: 0,
  },
  densityPreview: {
    gap: 4,
    marginBottom: tokens.spacing[2],
  },
  densityLine: {
    width: "100%",
    borderRadius: 4,
  },
  densityLabel: {
    ...tokens.typography.bodyMd,
  },
  densityDescription: {
    ...tokens.typography.caption,
  },

  // --- Setting rows ---
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing[3],
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[3],
  },

  // --- About rows ---
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing[3] + 2,
    paddingHorizontal: tokens.spacing[4],
    gap: tokens.spacing[2],
  },
  aboutLabel: {
    ...tokens.typography.body,
    flex: 1,
  },
  aboutValue: {
    ...tokens.typography.caption,
  },

  // --- Footer ---
  footer: {
    alignItems: "center",
    paddingVertical: tokens.spacing[5],
  },
  footerText: {
    ...tokens.typography.caption,
  },
});
