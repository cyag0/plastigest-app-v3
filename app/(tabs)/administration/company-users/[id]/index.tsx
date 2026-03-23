import UserFormShared from "@/components/screens/UserFormShared";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  IconButton,
  Text,
} from "react-native-paper";

export default function CompanyUserDetailScreen() {
  const params = useLocalSearchParams();
  const userId = params.id ? parseInt(params.id as string) : undefined;
  const { selectedCompany } = useAuth();
  const router = useRouter();

  const [workers, setWorkers] = useState<App.Entities.Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  useEffect(() => {
    if (userId && selectedCompany?.id) {
      loadWorkers();
    }
  }, [userId, selectedCompany?.id]);

  const loadWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const response = await Services.admin.workers.index({ all: true });
      const all: App.Entities.Worker[] = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      // Filtrar los workers de este usuario en la empresa actual
      setWorkers(all.filter((w) => w.user_id === userId));
    } catch (error) {
      console.error("Error loading workers:", error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Datos del usuario */}
      <UserFormShared
        id={userId}
        mode="company"
        companyId={selectedCompany?.id}
        readonly
      />

      <Divider style={{ marginHorizontal: 16 }} />

      {/* Panel de Membresías / Workers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <IconButton
              icon="account-hard-hat"
              size={20}
              iconColor={palette.primary}
              style={{ margin: 0 }}
            />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Sucursales Asignadas
            </Text>
          </View>
          <Button
            mode="contained-tonal"
            icon="plus"
            compact
            onPress={() =>
              router.push(
                `/(tabs)/administration/workers/form?user_id=${userId}` as any,
              )
            }
          >
            Agregar
          </Button>
        </View>

        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          Este usuario puede operar en las siguientes sucursales con su rol
          asignado
        </Text>

        {loadingWorkers ? (
          <ActivityIndicator
            color={palette.primary}
            style={{ marginTop: 16 }}
          />
        ) : workers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon
                source="account-off"
                size={36}
                color={palette.textSecondary}
              />
              <Text variant="bodyMedium" style={styles.emptyText}>
                Sin sucursales asignadas aún
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Agrega una asignación para que este usuario pueda operar en una
                sucursal
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.workerList}>
            {workers.map((worker) => (
              <Card key={worker.id} style={styles.workerCard}>
                <Card.Content>
                  <View style={styles.workerRow}>
                    {/* Info principal */}
                    <View style={{ flex: 1, gap: 6 }}>
                      {/* Sucursales */}
                      {worker.locations && worker.locations.length > 0 ? (
                        worker.locations.map((loc) => (
                          <View key={loc.id} style={styles.infoRow}>
                            <Icon
                              source="map-marker"
                              size={16}
                              color={palette.info}
                            />
                            <Text
                              variant="titleSmall"
                              style={styles.locationName}
                            >
                              {loc.name}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.infoRow}>
                          <Icon
                            source="map-marker-off"
                            size={16}
                            color={palette.textSecondary}
                          />
                          <Text
                            variant="bodySmall"
                            style={{ color: palette.textSecondary }}
                          >
                            Sin sucursal asignada
                          </Text>
                        </View>
                      )}

                      {/* Rol */}
                      {worker.role && (
                        <View style={styles.infoRow}>
                          <Icon
                            source="shield-account"
                            size={14}
                            color={palette.primary}
                          />
                          <Text variant="bodySmall" style={styles.roleText}>
                            {worker.role.name}
                          </Text>
                        </View>
                      )}

                      {/* Cargo / Departamento */}
                      {(worker.position || worker.department) && (
                        <Text variant="bodySmall" style={styles.positionText}>
                          {[worker.position, worker.department]
                            .filter(Boolean)
                            .join(" • ")}
                        </Text>
                      )}
                    </View>

                    {/* Acciones */}
                    <View style={styles.workerActions}>
                      <Chip
                        compact
                        style={{
                          backgroundColor: worker.is_active
                            ? palette.success
                            : palette.error,
                        }}
                        textStyle={styles.chipText}
                      >
                        {worker.is_active ? "Activo" : "Inactivo"}
                      </Chip>
                      <IconButton
                        icon="pencil"
                        size={18}
                        iconColor={palette.primary}
                        onPress={() =>
                          router.push(
                            `/(tabs)/administration/workers/${worker.id}/edit` as any,
                          )
                        }
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  sectionSubtitle: {
    color: palette.textSecondary,
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyText: {
    color: palette.text,
    fontWeight: "600",
  },
  emptySubtext: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  workerList: {
    gap: 12,
  },
  workerCard: {
    backgroundColor: palette.card,
    borderRadius: 12,
    elevation: 1,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationName: {
    color: palette.text,
    fontWeight: "600",
  },
  roleText: {
    color: palette.primary,
    fontWeight: "500",
  },
  positionText: {
    color: palette.textSecondary,
    marginTop: 2,
  },
  workerActions: {
    alignItems: "flex-end",
    gap: 4,
  },
  chipText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
});
