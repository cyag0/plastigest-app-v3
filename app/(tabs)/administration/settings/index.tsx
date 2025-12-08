import palette from "@/constants/palette";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Divider, List, Text } from "react-native-paper";

interface SettingOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { selectedLocation } = useSelectedLocation();

  const settingOptions: SettingOption[] = [
    {
      id: "notifications",
      title: "Notificaciones",
      description: "Configurar alertas y notificaciones push",
      icon: "bell-cog",
      route: "/(tabs)/administration/settings/notifications",
      color: palette.primary,
    },
    {
      id: "working-hours",
      title: "Horarios de Trabajo",
      description: "Define horarios de operación de la sucursal",
      icon: "clock-time-four",
      route: "/(tabs)/administration/settings/working-hours",
      color: palette.blue,
    },
    {
      id: "auto-tasks",
      title: "Tareas Automáticas",
      description: "Programar tareas recurrentes (conteos, reportes)",
      icon: "calendar-clock",
      route: "/(tabs)/administration/settings/auto-tasks",
      color: palette.accent,
    },
    {
      id: "limits",
      title: "Límites y Umbrales",
      description: "Configurar descuentos, aprobaciones y stock mínimo",
      icon: "speedometer",
      route: "/(tabs)/administration/settings/limits",
      color: palette.warning,
    },
    {
      id: "features",
      title: "Funcionalidades",
      description: "Activar o desactivar características especiales",
      icon: "toggle-switch",
      route: "/(tabs)/administration/settings/features",
      color: palette.secondary,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Info */}
        {selectedLocation && (
          <Card style={styles.headerCard}>
            <Card.Content style={styles.headerContent}>
              <MaterialCommunityIcons
                name="store-cog"
                size={32}
                color={palette.primary}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="titleMedium" style={styles.headerTitle}>
                  {selectedLocation.name}
                </Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>
                  Configura las preferencias de esta sucursal
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Settings List */}
        <Card style={styles.card}>
          <List.Section style={{ paddingVertical: 0 }}>
            {settingOptions.map((option, index) => (
              <React.Fragment key={option.id}>
                <List.Item
                  title={option.title}
                  description={option.description}
                  left={(props) => (
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: option.color + "20" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as any}
                        size={24}
                        color={option.color}
                      />
                    </View>
                  )}
                  right={(props) => (
                    <List.Icon
                      {...props}
                      icon="chevron-right"
                      color={palette.textSecondary}
                    />
                  )}
                  onPress={() => router.push(option.route as any)}
                  style={styles.listItem}
                />
                {index < settingOptions.length - 1 && (
                  <Divider style={styles.divider} />
                )}
              </React.Fragment>
            ))}
          </List.Section>
        </Card>

        {/* Info Footer */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={palette.blue}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={styles.infoText}>
                  La configuración se aplica únicamente a la sucursal
                  seleccionada. Cada sucursal puede tener sus propios ajustes.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  headerCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: palette.primary + "10",
    elevation: 0,
    shadowColor: "transparent",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  headerSubtitle: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  card: {
    margin: 16,
    marginTop: 0,
    backgroundColor: palette.surface,
    elevation: 0,
    shadowColor: "transparent",
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  divider: {
    marginHorizontal: 16,
  },
  infoCard: {
    margin: 16,
    backgroundColor: palette.blue + "10",
    elevation: 0,
    shadowColor: "transparent",
  },
  infoText: {
    color: palette.text,
    lineHeight: 18,
  },
});
