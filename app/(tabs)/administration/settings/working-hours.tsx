import palette from "@/constants/palette";
import { useDebounce } from "@/hooks/useDebounce";
import { useSelectedLocation } from "@/hooks/useSelectedLocation";
import Services from "@/utils/services";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export default function WorkingHoursSettingsScreen() {
  const { selectedLocation, setSelectedLocation } = useSelectedLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<App.Entities.LocationSettings>({});
  const debouncedSettings = useDebounce(settings, 500);

  useEffect(() => {
    loadSettings();
  }, [selectedLocation]);

  // Auto-save on debounced settings change
  useEffect(() => {
    if (!loading && debouncedSettings) {
      autoSave(debouncedSettings);
    }
  }, [debouncedSettings]);

  const loadSettings = async () => {
    if (!selectedLocation) {
      setLoading(false);
      return;
    }

    try {
      const response = await Services.admin.settings.getSettings(
        selectedLocation.id
      );
      setSettings(response.data.data || getDefaultWorkingHours());
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettings(getDefaultWorkingHours());
    }
    setLoading(false);
  };

  const getDefaultWorkingHours = (): App.Entities.LocationSettings => {
    const defaultHours = {
      start: "09:00",
      end: "18:00",
      enabled: true,
    };

    return {
      working_hours: {
        monday: defaultHours,
        tuesday: defaultHours,
        wednesday: defaultHours,
        thursday: defaultHours,
        friday: defaultHours,
        saturday: { start: "09:00", end: "14:00", enabled: true },
        sunday: { start: "09:00", end: "18:00", enabled: false },
      },
    };
  };

  const autoSave = async (newSettings: App.Entities.LocationSettings) => {
    if (!selectedLocation) return;

    try {
      setSaving(true);
      await Services.admin.settings.updateSettings(
        selectedLocation.id,
        newSettings
      );

      // Update local context
      setSelectedLocation({
        ...selectedLocation,
        settings: newSettings,
      });
    } catch (error) {
      console.error("Error auto-saving settings:", error);
      Alert.alert("Error", "No se pudieron guardar los horarios");
    } finally {
      setSaving(false);
    }
  };

  const updateDayHours = (
    day: DayOfWeek,
    field: "start" | "end" | "enabled",
    value: string | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      working_hours: {
        ...prev.working_hours,
        [day]: {
          ...prev.working_hours?.[day],
          [field]: value,
        },
      },
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Info Card */}
        {saving && (
          <Card style={styles.savingCard}>
            <Card.Content>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <ActivityIndicator size="small" color={palette.primary} />
                <Text variant="bodySmall" style={{ color: palette.text }}>
                  Guardando cambios...
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {DAYS.map((day) => {
          const daySettings = settings.working_hours?.[day.key] || {
            start: "09:00",
            end: "18:00",
            enabled: true,
          };

          return (
            <Card key={day.key} style={styles.card}>
              <Card.Content>
                <View style={styles.dayHeader}>
                  <Text variant="titleMedium" style={{ flex: 1 }}>
                    {day.label}
                  </Text>
                  <Switch
                    value={daySettings.enabled ?? true}
                    onValueChange={(value) =>
                      updateDayHours(day.key, "enabled", value)
                    }
                    color={palette.primary}
                  />
                </View>

                {daySettings.enabled && (
                  <View style={styles.hoursRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text variant="labelSmall" style={styles.label}>
                        Apertura
                      </Text>
                      <TextInput
                        value={daySettings.start || "09:00"}
                        onChangeText={(value) =>
                          updateDayHours(day.key, "start", value)
                        }
                        placeholder="09:00"
                        mode="outlined"
                        dense
                        style={styles.input}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="labelSmall" style={styles.label}>
                        Cierre
                      </Text>
                      <TextInput
                        value={daySettings.end || "18:00"}
                        onChangeText={(value) =>
                          updateDayHours(day.key, "end", value)
                        }
                        placeholder="18:00"
                        mode="outlined"
                        dense
                        style={styles.input}
                      />
                    </View>
                  </View>
                )}

                {!daySettings.enabled && (
                  <Text
                    variant="bodySmall"
                    style={[styles.closedText, { marginTop: 8 }]}
                  >
                    Cerrado
                  </Text>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  savingCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: palette.primary + "10",
    elevation: 0,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: palette.surface,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: "row",
    gap: 8,
  },
  label: {
    color: palette.textSecondary,
    marginBottom: 4,
  },
  input: {
    backgroundColor: palette.background,
  },
  closedText: {
    color: palette.textSecondary,
    fontStyle: "italic",
  },
});
