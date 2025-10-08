import palette from "@/constants/palette";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface Company {
  id: number;
  name: string;
  description: string;
  logo?: string;
  isActive: boolean;
  isCurrent?: boolean;
}

const companies: Company[] = [
  {
    id: 1,
    name: "Jara",
    description: "Empresa Jara - Gestión integral de plásticos",
    isActive: true,
    isCurrent: true, // Compañía actual por defecto
  },
  {
    id: 2,
    name: "Cocos Francisco",
    description: "Cocos Francisco - Soluciones plásticas innovadoras",
    isActive: true,
    isCurrent: false,
  },
];

export default function SelectCompanyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [selectedCompany, setSelectedCompany] = useState<number>(
    companies.find((c) => c.isCurrent)?.id || 1
  );
  const [loading, setLoading] = useState(false);

  const handleSelectCompany = async (companyId: number) => {
    try {
      setLoading(true);

      // Aquí harías la llamada a la API para cambiar de compañía
      // await Services.auth.switchCompany(companyId);

      // Simular delay de API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const selectedCompanyName = companies.find(
        (c) => c.id === companyId
      )?.name;

      Alert.alert(
        "Compañía seleccionada",
        `Has cambiado a ${selectedCompanyName}`,
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
    return companies.find((c) => c.isCurrent)?.name || "Ninguna";
  };

  console.log("Selected Company I xdxdD:", selectedCompany);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Current company indicator */}

        <Text
          variant="labelLarge"
          style={[
            styles.currentCompanyLabel,
            { color: theme.colors.onPrimaryContainer },
          ]}
        >
          Compañía actual: {getCurrentCompanyName()}
        </Text>

        <Text
          variant="bodyLarge"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Selecciona la compañía con la que deseas trabajar
        </Text>

        {companies.map((company) => (
          <Surface
            key={company.id}
            style={[
              styles.companyCard,
              { backgroundColor: palette.surface },
              selectedCompany === company.id && {
                borderColor: palette.primary,
                borderWidth: 2,
              },
              company.isCurrent && {
                backgroundColor: palette.background,
              },
            ]}
          >
            <TouchableRipple
              onPress={() => setSelectedCompany(company.id)}
              style={styles.cardContent}
              disabled={loading}
            >
              <View style={styles.companyContent}>
                {/* Logo placeholder */}
                <View style={styles.logoContainer}>
                  <View style={styles.logoPlaceholder}>
                    {company.logo ? (
                      <Avatar.Image
                        size={80}
                        source={{ uri: company.logo }}
                        style={styles.logo}
                      />
                    ) : (
                      <Avatar.Text
                        size={80}
                        label={getCompanyInitials(company.name)}
                        style={[
                          styles.logo,
                          {
                            backgroundColor: company.isCurrent
                              ? theme.colors.primary
                              : theme.colors.secondary,
                          },
                        ]}
                        labelStyle={{ fontSize: 24, fontWeight: "bold" }}
                      />
                    )}
                    {/* Placeholder para imagen */}
                    <View
                      style={[
                        styles.imagePlaceholder,
                        { borderColor: theme.colors.outline },
                      ]}
                    >
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Logo
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Company info */}
                <View style={styles.companyInfo}>
                  <View style={styles.companyHeader}>
                    <Text
                      variant="headlineSmall"
                      style={[
                        styles.companyName,
                        {
                          color: company.isCurrent
                            ? theme.colors.onPrimaryContainer
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {company.name}
                    </Text>
                    {company.isCurrent && (
                      <View
                        style={[
                          styles.currentBadge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: "#fff", fontWeight: "bold" }}
                        >
                          ACTUAL
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.companyDescription,
                      {
                        color: company.isCurrent
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {company.description}
                  </Text>

                  {/* Status badge */}
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: company.isActive
                            ? theme.colors.surfaceVariant
                            : theme.colors.errorContainer,
                        },
                      ]}
                    >
                      <Text
                        variant="labelSmall"
                        style={{
                          color: company.isActive
                            ? theme.colors.onSurfaceVariant
                            : theme.colors.onErrorContainer,
                          fontWeight: "600",
                        }}
                      >
                        {company.isActive ? "✓ Activa" : "✗ Inactiva"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Selection indicator */}
                {selectedCompany === company.id && (
                  <View style={styles.selectionIndicator}>
                    <Avatar.Icon
                      size={40}
                      icon="check-circle"
                      style={{
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                  </View>
                )}
              </View>
            </TouchableRipple>
          </Surface>
        ))}

        {/* Action button */}
        {selectedCompany &&
          selectedCompany !== companies.find((c) => c.isCurrent)?.id && (
            <Button
              mode="contained"
              onPress={() => handleSelectCompany(selectedCompany)}
              style={styles.actionButton}
              icon="building"
              loading={loading}
              disabled={loading}
            >
              {loading ? "Cambiando compañía..." : "Confirmar cambio"}
            </Button>
          )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              textAlign: "center",
            }}
          >
            Puedes cambiar de compañía en cualquier momento desde tu perfil.
            {"\n"}
            Los datos mostrados corresponderán a la compañía seleccionada.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  currentCompanyCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  currentCompanyLabel: {
    textAlign: "center",
    fontWeight: "600",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  companyCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  cardContent: {
    padding: 20,
  },
  companyContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoContainer: {
    marginRight: 16,
    alignItems: "center",
  },
  logoPlaceholder: {
    alignItems: "center",
  },
  logo: {
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  companyInfo: {
    flex: 1,
  },
  companyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  companyName: {
    fontWeight: "600",
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  companyDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  statusContainer: {
    flexDirection: "row",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  selectionIndicator: {
    marginLeft: 12,
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
});
