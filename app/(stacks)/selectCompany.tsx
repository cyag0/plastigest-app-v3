import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, IconButton, Text } from "react-native-paper";

interface Company {
  id: number;
  name: string;
  business_name: string;
  rfc: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

export default function SelectCompanyScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const {
    companies,
    selectedCompany: currentCompany,
    selectCompany,
    isLoadingCompanies,
    loadCompanies,
    selectLocation,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Cargar compañías al montar el componente
  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, []);

  const loadAndSelectLocation = async (companyId: number) => {
    try {
      setLoadingLocations(true);
      const response = await Services.admin.locations.index({
        all: true,
        company_id: companyId,
      });

      let locationsData = response.data;
      if (
        locationsData &&
        typeof locationsData === "object" &&
        "data" in locationsData
      ) {
        locationsData = locationsData.data;
      }

      if (Array.isArray(locationsData) && locationsData.length === 1) {
        // Auto-seleccionar si solo hay una ubicación
        await selectLocation(locationsData[0]);
      }

      await selectLocation(null);
    } catch (error) {
      console.error("Error loading locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSelectCompany = async (companyId: number) => {
    const companyToSelect = companies.find((c) => c.id === companyId);
    if (!companyToSelect) {
      alerts.error("Compañía no encontrada");
      return;
    }

    const confirmed = await alerts.confirm(
      `¿Cambiar a ${companyToSelect.name}?`,
      {
        title: "Confirmar Cambio",
        okText: "Cambiar",
        cancelText: "Cancelar",
      }
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // Limpiar ubicación al cambiar de compañía
      await selectLocation(null);

      // Seleccionar la compañía usando el contexto
      await selectCompany(companyToSelect);

      // Cargar y auto-seleccionar ubicación si solo hay una
      await loadAndSelectLocation(companyId);

      alerts.success(`Has cambiado a ${companyToSelect.name}`);
      router.back();
    } catch (error) {
      alerts.error("No se pudo cambiar de compañía. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <IconButton
              icon="office-building"
              size={32}
              iconColor={palette.primary}
              style={{ margin: 0 }}
            />
          </View>
          <Text variant="headlineSmall" style={styles.title}>
            Selecciona tu Compañía
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Cambia entre las empresas a las que tienes acceso
          </Text>
        </View>

        {/* Current Company Badge */}
        {currentCompany && (
          <Card style={styles.currentCompanyCard}>
            <Card.Content style={styles.currentCompanyContent}>
              <View style={styles.currentCompanyIcon}>
                <IconButton
                  icon="check-circle"
                  size={20}
                  iconColor={palette.success}
                  style={{ margin: 0 }}
                />
              </View>
              <View style={styles.currentCompanyText}>
                <Text variant="labelSmall" style={styles.currentCompanyLabel}>
                  COMPAÑÍA ACTUAL
                </Text>
                <Text variant="titleMedium" style={styles.currentCompanyName}>
                  {currentCompany.name}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Loading State */}
        {isLoadingCompanies || loadingLocations ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>
              {loadingLocations
                ? "Configurando ubicación..."
                : "Cargando compañías..."}
            </Text>
          </View>
        ) : companies.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons
                name="office-building-outline"
                size={64}
                color={palette.textSecondary}
                style={{ opacity: 0.5 }}
              />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No hay compañías disponibles
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                Contacta al administrador para obtener acceso
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Selecciona una Empresa
            </Text>
            <View style={styles.companiesGrid}>
              {companies.map((company) => {
                const isCurrentCompany = currentCompany?.id === company.id;

                return (
                  <Card
                    key={company.id}
                    style={[
                      styles.companyActionCard,
                      isCurrentCompany
                        ? styles.currentCompanyActionCard
                        : styles.availableCompanyActionCard,
                    ]}
                    onPress={() => {
                      if (!isCurrentCompany && !loading) {
                        handleSelectCompany(company.id);
                      }
                    }}
                    disabled={loading}
                  >
                    <Card.Content style={styles.companyActionContent}>
                      {/* Icon */}
                      <View style={styles.companyIconContainer}>
                        <MaterialCommunityIcons
                          name="office-building"
                          size={40}
                          color={
                            isCurrentCompany ? palette.success : palette.primary
                          }
                        />
                        {isCurrentCompany && (
                          <View style={styles.currentBadgeIcon}>
                            <MaterialCommunityIcons
                              name="check-circle"
                              size={20}
                              color={palette.success}
                            />
                          </View>
                        )}
                      </View>

                      {/* Company Name */}
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.companyActionName,
                          {
                            color: isCurrentCompany
                              ? palette.success
                              : palette.primary,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {company.name}
                      </Text>

                      {/* Business Name */}
                      <Text
                        variant="bodySmall"
                        style={styles.companyActionBusinessName}
                        numberOfLines={1}
                      >
                        {company.business_name}
                      </Text>

                      {/* Status Badge */}
                      {isCurrentCompany && (
                        <View style={styles.currentBadge}>
                          <Text
                            variant="labelSmall"
                            style={styles.currentBadgeText}
                          >
                            ACTUAL
                          </Text>
                        </View>
                      )}

                      {/* RFC */}
                      <Text
                        variant="labelSmall"
                        style={styles.companyActionRfc}
                      >
                        {company.rfc}
                      </Text>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          </>
        )}

        {/* Footer Info */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={palette.blue}
            />
            <Text variant="bodySmall" style={styles.infoText}>
              Al cambiar de compañía, la ubicación se reiniciará. Si la empresa
              tiene solo una ubicación, se seleccionará automáticamente.
            </Text>
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
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerIcon: {
    backgroundColor: palette.primary + "15",
    borderRadius: 50,
    padding: 8,
    marginBottom: 12,
  },
  title: {
    color: palette.text,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.85,
  },
  currentCompanyCard: {
    backgroundColor: palette.success + "10",
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: palette.success,
    shadowColor: "transparent",
  },
  currentCompanyContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  currentCompanyIcon: {
    marginRight: 12,
  },
  currentCompanyText: {
    flex: 1,
  },
  currentCompanyLabel: {
    color: palette.success,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  currentCompanyName: {
    color: palette.text,
    fontWeight: "600",
  },
  centerContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  emptyCard: {
    backgroundColor: palette.surface,
    borderRadius: 16,
    marginTop: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    color: palette.text,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
  sectionTitle: {
    color: palette.textSecondary,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  companiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  companyActionCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
    elevation: 2,
  },
  currentCompanyActionCard: {
    backgroundColor: palette.success + "15",
    borderWidth: 2,
    borderColor: palette.success + "40",
  },
  availableCompanyActionCard: {
    backgroundColor: palette.primary + "15",
    borderWidth: 1,
    borderColor: palette.primary + "20",
  },
  companyActionContent: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
    gap: 8,
  },
  companyIconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  currentBadgeIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: palette.surface,
    borderRadius: 10,
  },
  companyActionName: {
    fontWeight: "bold",
    textAlign: "center",
    minHeight: 44,
  },
  companyActionBusinessName: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.8,
  },
  currentBadge: {
    backgroundColor: palette.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  currentBadgeText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  companyActionRfc: {
    color: palette.textSecondary,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: palette.blue + "10",
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: palette.blue,
    shadowColor: "transparent",
  },
  infoContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: palette.textSecondary,
    lineHeight: 18,
  },
});
