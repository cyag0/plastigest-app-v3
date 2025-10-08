import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function LocationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const locationId = params.id as string;

  const [location, setLocation] = useState<App.Entities.Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadLocationData();
  }, [locationId]);

  const loadLocationData = async () => {
    try {
      setLoading(true);
      const response = await Services.admin.locations.show(locationId);
      setLocation(response.data.data);
    } catch (error) {
      console.error("Error loading location:", error);
      Alert.alert("Error", "No se pudo cargar la información de la sucursal");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/(tabs)/home/locations/form?id=${locationId}`);
  };

  const handleDelete = () => {
    Alert.alert(
      "Confirmar eliminación",
      `¿Estás seguro que deseas eliminar la sucursal "${location?.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: confirmDelete },
      ]
    );
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await Services.admin.locations.destroy(locationId);
      Alert.alert("Éxito", "Sucursal eliminada correctamente", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error deleting location:", error);
      Alert.alert("Error", "No se pudo eliminar la sucursal");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Cargando información...
          </Text>
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text variant="bodyLarge" style={styles.errorText}>
            No se encontró la sucursal
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header card */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <Avatar.Text
              size={80}
              label={location.name?.charAt(0)?.toUpperCase() || "S"}
              style={styles.avatar}
            />

            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.locationName}>
                {location.name}
              </Text>

              {location.description && (
                <Text variant="bodyMedium" style={styles.description}>
                  {location.description}
                </Text>
              )}

              <Chip
                style={[
                  styles.statusChip,
                  location.is_active ? styles.activeChip : styles.inactiveChip,
                ]}
                textStyle={[
                  styles.statusText,
                  location.is_active ? styles.activeText : styles.inactiveText,
                ]}
                compact
              >
                {location.is_active ? "✓ Activa" : "✗ Inactiva"}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Contact information */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Información de Contacto
            </Text>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Dirección:
              </Text>
              <Text variant="bodyMedium" style={styles.value}>
                {location.address}
              </Text>
            </View>

            {location.phone && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Teléfono:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {location.phone}
                </Text>
              </View>
            )}

            {location.email && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Email:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {location.email}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Company information */}
        {location.company && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Compañía
              </Text>

              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Nombre:
                </Text>
                <Text variant="bodyMedium" style={styles.companyName}>
                  {location.company.name}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>
                  Razón Social:
                </Text>
                <Text variant="bodyMedium" style={styles.value}>
                  {location.company.business_name}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Metadata */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Información del Sistema
            </Text>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                ID:
              </Text>
              <Text variant="bodyMedium" style={styles.value}>
                #{location.id}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Creada:
              </Text>
              <Text variant="bodyMedium" style={styles.value}>
                {new Date(location.created_at).toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>
                Actualizada:
              </Text>
              <Text variant="bodyMedium" style={styles.value}>
                {new Date(location.updated_at).toLocaleDateString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
      {/* Action buttons */}
      <View style={[styles.actions, { padding: 16 }]}>
        <Button
          mode="contained"
          onPress={handleEdit}
          style={styles.editButton}
          buttonColor={palette.primary}
          textColor="#fff"
          icon="pencil"
        >
          Editar Sucursal
        </Button>

        <Button
          mode="outlined"
          onPress={handleDelete}
          style={styles.deleteButton}
          textColor={palette.error}
          loading={deleting}
          disabled={deleting}
          icon="delete"
        >
          Eliminar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
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
  errorText: {
    textAlign: "center",
    color: palette.error,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  avatar: {
    backgroundColor: palette.primary,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  locationName: {
    color: palette.text,
    fontWeight: "bold",
    marginBottom: 4,
  },
  description: {
    color: palette.primary,
    fontWeight: "600",
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: "flex-start",
  },
  activeChip: {
    backgroundColor: palette.success,
  },
  inactiveChip: {
    backgroundColor: palette.error,
  },
  statusText: {
    fontWeight: "600",
  },
  activeText: {
    color: "#fff",
  },
  inactiveText: {
    color: "#fff",
  },
  card: {
    marginBottom: 16,
    backgroundColor: "#fff",
    elevation: 1,
  },
  sectionTitle: {
    color: palette.textSecondary,
    fontWeight: "600",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  label: {
    color: palette.textSecondary,
    fontWeight: "500",
    width: 100,
    marginRight: 8,
  },
  value: {
    color: palette.text,
    flex: 1,
  },
  companyName: {
    color: palette.primary,
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    borderRadius: 8,
  },
  deleteButton: {
    borderRadius: 8,
    borderColor: palette.error,
  },
});
