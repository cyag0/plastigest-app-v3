import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  Text,
} from "react-native-paper";

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
  const {
    companies,
    selectedCompany: currentCompany,
    selectCompany,
    isLoadingCompanies,
    loadCompanies,
  } = useAuth();

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    currentCompany?.id || null
  );
  const [loading, setLoading] = useState(false);

  // Cargar compañías al montar el componente
  useEffect(() => {
    if (companies.length === 0) {
      loadCompanies();
    }
  }, []);

  // Actualizar selección cuando cambie la compañía actual
  useEffect(() => {
    if (currentCompany) {
      setSelectedCompanyId(currentCompany.id);
    }
  }, [currentCompany]);

  const handleSelectCompany = async (companyId: number) => {
    try {
      setLoading(true);

      const companyToSelect = companies.find((c) => c.id === companyId);
      if (!companyToSelect) {
        Alert.alert("Error", "Compañía no encontrada");
        return;
      }

      // Seleccionar la compañía usando el contexto
      await selectCompany(companyToSelect);

      Alert.alert(
        "Compañía seleccionada",
        `Has cambiado a ${companyToSelect.name}`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo cambiar de compañía. Intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const getCompanyInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getCurrentCompanyName = () => {
    return currentCompany?.name || "Ninguna";
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.currentCompanyContainer}>
          <Text variant="labelLarge" style={styles.currentCompanyLabel}>
            Compañía actual: {getCurrentCompanyName()}
          </Text>
        </View>
        {isLoadingCompanies ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={palette.primary} />
            <Text variant="bodyMedium" style={styles.loadingText}>
              Cargando compañías...
            </Text>
          </View>
        ) : companies.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No hay compañías disponibles
            </Text>
          </View>
        ) : (
          companies.map((company) => {
            const isCurrentCompany = currentCompany?.id === company.id;
            const isSelected = selectedCompanyId === company.id;

            return (
              <Card
                key={company.id}
                style={[
                  styles.companyCard,
                  isSelected && styles.selectedCard,
                  isCurrentCompany && styles.currentCard,
                ]}
                onPress={() => setSelectedCompanyId(company.id)}
              >
                <Card.Content style={styles.cardContent}>
                  <View style={styles.companyContent}>
                    {/* Avatar */}
                    <View style={styles.logoContainer}>
                      <Avatar.Text
                        size={50}
                        label={getCompanyInitials(company.name)}
                        style={[
                          styles.avatar,
                          isCurrentCompany && styles.currentAvatar,
                        ]}
                      />
                    </View>

                    {/* Company info */}
                    <View style={styles.companyInfo}>
                      <View style={styles.companyHeader}>
                        <Text variant="titleMedium" style={styles.companyName}>
                          {company.name}
                        </Text>
                        {isCurrentCompany && (
                          <Chip
                            style={styles.currentBadge}
                            textStyle={styles.currentBadgeText}
                            compact
                          >
                            ACTUAL
                          </Chip>
                        )}
                      </View>

                      <Text variant="bodyMedium" style={styles.businessName}>
                        {company.business_name}
                      </Text>

                      {/* Details */}
                      <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                          <Text style={styles.label}>RFC:</Text>
                          <Text style={styles.value}>{company.rfc}</Text>
                        </View>
                        {company.email && (
                          <View style={styles.detailRow}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{company.email}</Text>
                          </View>
                        )}
                      </View>

                      {/* Status badge */}
                      <Chip
                        style={[
                          styles.statusBadge,
                          company.is_active
                            ? styles.activeBadge
                            : styles.inactiveBadge,
                        ]}
                        textStyle={[
                          styles.statusBadgeText,
                          company.is_active
                            ? styles.activeText
                            : styles.inactiveText,
                        ]}
                        compact
                      >
                        {company.is_active ? "✓ Activa" : "✗ Inactiva"}
                      </Chip>
                    </View>

                    {/* Selection indicator */}
                    {isSelected && (
                      <View style={styles.selectionIndicator}>
                        <Avatar.Icon
                          size={40}
                          icon="check-circle"
                          style={styles.checkIcon}
                        />
                      </View>
                    )}
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}
        {/* Action button */}
        {selectedCompanyId && selectedCompanyId !== currentCompany?.id && (
          <Button
            mode="contained"
            onPress={() => handleSelectCompany(selectedCompanyId)}
            style={styles.actionButton}
            buttonColor={palette.primary}
            textColor="#fff"
            icon="building"
            loading={loading}
            disabled={loading}
          >
            {loading ? "Cambiando compañía..." : "Confirmar cambio"}
          </Button>
        )}
        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Puedes cambiar de compañía en cualquier momento desde tu perfil.
            {"\n"}
            Los datos mostrados corresponderán a la compañía seleccionada.
          </Text>
        </View>
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
    padding: 16,
    paddingBottom: 32,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    color: palette.text,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.8,
  },
  currentCompanyContainer: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: palette.primary,
  },
  currentCompanyLabel: {
    textAlign: "center",
    fontWeight: "600",
    color: palette.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: palette.textSecondary,
  },
  emptyText: {
    color: palette.textSecondary,
    opacity: 0.7,
    textAlign: "center",
  },
  companyCard: {
    marginBottom: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  selectedCard: {
    borderColor: palette.primary,
    borderWidth: 2,
  },
  currentCard: {
    backgroundColor: palette.surface,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  companyContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  logoContainer: {
    marginRight: 12,
    justifyContent: "center",
  },
  avatar: {
    backgroundColor: palette.primary,
  },
  currentAvatar: {
    backgroundColor: palette.accent,
  },
  companyInfo: {
    flex: 1,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  companyName: {
    fontWeight: "bold",
    color: palette.text,
    flex: 1,
  },
  currentBadge: {
    backgroundColor: palette.primary,
    marginLeft: 8,
  },
  currentBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
  },
  businessName: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
    marginBottom: 8,
  },
  detailsContainer: {
    gap: 4,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.textSecondary,
    marginRight: 6,
  },
  value: {
    fontSize: 12,
    color: palette.text,
    flex: 1,
  },
  statusBadge: {
    alignSelf: "flex-start",
  },
  activeBadge: {
    backgroundColor: palette.success,
  },
  inactiveBadge: {
    backgroundColor: palette.error,
  },
  statusBadgeText: {
    fontWeight: "600",
    fontSize: 11,
  },
  activeText: {
    color: "#fff",
  },
  inactiveText: {
    color: "#fff",
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  checkIcon: {
    backgroundColor: palette.primary,
  },
  actionButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 16,
  },
  footerText: {
    color: palette.textSecondary,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 18,
  },
});
