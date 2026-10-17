import { useAllLocationsAccess } from "@/components/Administration/Users/useUserScope";
import AppBar from "@/components/App/AppBar";
import {
  LIST_TEXT_INSET,
  ListGroup,
  ListRow,
  ListSection,
  ListValueRow,
} from "@/components/App/ListGroup";
import { notificationPreferencesRoute } from "@/components/Notifications/notificationLinks";
import { useAuth } from "@/contexts/AuthContext";
import { ThemePreference, useTheme } from "@/contexts/ThemeContext";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { getAppVersionLabel } from "@/utils/appVersion";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    value: "light",
    label: "Claro",
    description: "Fondo claro, para el día",
    icon: "white-balance-sunny",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Cansa menos la vista de noche",
    icon: "weather-night",
  },
  {
    value: "system",
    label: "Igual que el dispositivo",
    description: "Cambia solo con el ajuste del teléfono o la computadora",
    icon: "cellphone-cog",
  },
];

/**
 * Preferencias de este dispositivo. Solo lo que de verdad cambia algo: el
 * tema (se guarda en el dispositivo) y el acceso a las preferencias de
 * notificaciones.
 */
export default function PreferencesScreen() {
  const router = useRouter();
  const { location } = useAuth();
  // Quien no entra a todas las sucursales abre las de su sucursal.
  const allLocations = useAllLocationsAccess();
  // Preferencias de notificaciones: pide notifications_list (mapa central).
  const { canAccessRoute } = useCan();
  const notificationPrefsRoute = notificationPreferencesRoute(allLocations, !!location);
  const showNotificationPrefs = canAccessRoute(notificationPrefsRoute);
  const { preference, colors, setPreference } = useTheme();

  const styles = useThemedStyles((c) => ({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 22,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
    },
  }));

  return (
    <View style={styles.safe}>
      <AppBar title="Preferencias" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <ListSection title="Apariencia">
          <ListGroup>
            {THEME_OPTIONS.map((opt) => {
              const selected = preference === opt.value;
              return (
                <ListRow
                  key={opt.value}
                  icon={opt.icon}
                  iconColor={selected ? colors.primary : undefined}
                  title={opt.label}
                  strong={selected}
                  subtitle={opt.description}
                  chevron={false}
                  trailing={
                    selected ? (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    ) : undefined
                  }
                  onPress={() => setPreference(opt.value)}
                  accessibilityLabel={`${opt.label}${selected ? ", seleccionado" : ""}`}
                />
              );
            })}
          </ListGroup>
        </ListSection>

        {showNotificationPrefs && (
          <ListSection title="Notificaciones">
            <ListGroup>
              <ListRow
                icon="bell-cog-outline"
                title="Preferencias de notificaciones"
                subtitle="Qué avisos llegan y a quién"
                onPress={() => router.push(notificationPrefsRoute as any)}
              />
            </ListGroup>
          </ListSection>
        )}

        <ListSection title="Acerca de">
          <ListGroup inset={LIST_TEXT_INSET}>
            <ListValueRow label="Versión" value={`GCStock v${getAppVersionLabel()}`} />
            <ListValueRow label="Idioma" value="Español (México)" />
            <ListValueRow
              label="Zona horaria"
              value={Intl.DateTimeFormat().resolvedOptions().timeZone || "Automática"}
            />
          </ListGroup>
        </ListSection>
      </ScrollView>
    </View>
  );
}
