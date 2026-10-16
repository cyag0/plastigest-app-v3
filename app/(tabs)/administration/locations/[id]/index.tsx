import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import { goBack } from "@/utils/navigation";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
  const alerts = useAlerts();
  const { hasPermission } = useAuth();
  const params = useLocalSearchParams();
  const locationId = params.id as string;
  // Sin el permiso el backend responde 403: los botones no se ofrecen.
  const canEdit = hasPermission("locations_update");
  const canDelete = hasPermission("locations_delete");

  // El detalle trae la compañía anidada (el tipo base no la declara).
  const [location, setLocation] = useState<
    | (App.Entities.Location & {
        company?: { name?: string; business_name?: string } | null;
      })
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  // 404 (otra sucursal u otra empresa) o falla: se explica aquí; antes se
  // regresaba a Inicio con un aviso.
  const [loadProblem, setLoadProblem] = useState<RecordLoadProblem | null>(null);
  const loadedRef = useRef(false);

  const loadLocationData = async () => {
    // La primera carga muestra el spinner; al volver (p. ej. de editar) se
    // refresca sin parpadeo.
    const firstLoad = !loadedRef.current;
    try {
      if (firstLoad) setLoading(true);
      // silent: la falla se explica en la pantalla.
      const response = await Services.admin.locations.show(locationId, undefined, { silent: true });
      setLocation(response.data.data);
      setLoadProblem(null);
      loadedRef.current = true;
    } catch (error: any) {
      // Al volver a una que ya se veía, se queda como estaba.
      if (firstLoad) {
        setLoadProblem(
          recordLoadProblem(error, "No se pudo cargar la información de la sucursal."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Se recarga al volver a la pantalla: después de editar se veían los datos
  // viejos.
  useFocusEffect(
    useCallback(() => {
      loadLocationData();
      // loadLocationData solo depende de locationId.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]),
  );

  const handleEdit = () => {
    router.push(`/(tabs)/administration/locations/form?id=${locationId}`);
  };

  // Antes era Alert.alert con botones: en web no hace nada y la sucursal no
  // se podía eliminar desde aquí.
  const handleDelete = async () => {
    const confirmed = await alerts.confirm(
      `¿Estás seguro de que deseas eliminar la sucursal "${location?.name ?? ""}"?`,
      {
        title: "Confirmar eliminación",
        okText: "Eliminar",
        cancelText: "Cancelar",
      },
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      await Services.admin.locations.destroy(locationId);
      alerts.success("Sucursal eliminada correctamente");
      goBack();
    } catch (error: any) {
      console.error("Error deleting location:", error);
      alerts.error(
        error?.response?.data?.message || "No se pudo eliminar la sucursal",
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loadProblem && !location) {
    return (
      <RecordLoadError
        problem={loadProblem}
        notFoundTitle="No se encontró la sucursal"
        errorTitle="No se pudo cargar la sucursal"
        onRetry={loadLocationData}
      />
    );
  }

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
      {(canEdit || canDelete) && (
        <View style={[styles.actions, { padding: 16 }]}>
          {canEdit && (
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
          )}

          {canDelete && (
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
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent" as any,
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
