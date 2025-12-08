import { useAuth } from "@/contexts/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Divider,
  Surface,
  Text,
  useTheme,
  Portal,
  Dialog,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

// Importaciones dinámicas para evitar errores de tipos
const Location = require("expo-location");
const MediaLibrary = require("expo-media-library");

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

interface AppPermissions {
  camera: PermissionStatus;
  notifications: PermissionStatus;
  location: PermissionStatus;
  mediaLibrary: PermissionStatus;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout, isLoading, selectedCompany, location } = useAuth();
  const [permissions, setPermissions] = useState<AppPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      setLoadingPermissions(true);

      const [
        cameraStatus,
        notificationStatus,
        locationStatus,
        mediaLibraryStatus,
      ] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        Notifications.getPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
      ]);

      setPermissions({
        camera: {
          granted: cameraStatus.granted,
          canAskAgain: cameraStatus.canAskAgain,
          status: cameraStatus.status,
        },
        notifications: {
          granted: notificationStatus.granted,
          canAskAgain: notificationStatus.canAskAgain,
          status: notificationStatus.status,
        },
        location: {
          granted: locationStatus.granted,
          canAskAgain: locationStatus.canAskAgain,
          status: locationStatus.status,
        },
        mediaLibrary: {
          granted: mediaLibraryStatus.granted,
          canAskAgain: mediaLibraryStatus.canAskAgain,
          status: mediaLibraryStatus.status,
        },
      });
    } catch (error) {
      console.error("Error checking permissions:", error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const requestPermission = async (permissionType: keyof AppPermissions) => {
    try {
      let result;

      switch (permissionType) {
        case "camera":
          result = await Camera.requestCameraPermissionsAsync();
          break;
        case "notifications":
          result = await Notifications.requestPermissionsAsync();
          break;
        case "location":
          result = await Location.requestForegroundPermissionsAsync();
          break;
        case "mediaLibrary":
          result = await MediaLibrary.requestPermissionsAsync();
          break;
      }

      if (result) {
        await checkPermissions();

        if (!result.granted && !result.canAskAgain) {
          Alert.alert(
            "Permiso Denegado",
            "Has denegado este permiso permanentemente. Para activarlo, ve a la configuración de la aplicación.",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Abrir Configuración",
                onPress: () => Linking.openSettings(),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
      Alert.alert("Error", "No se pudo solicitar el permiso");
    }
  };

  const getPermissionIcon = (permission: PermissionStatus) => {
    if (permission.granted) return "check-circle";
    if (!permission.canAskAgain) return "cancel";
    return "alert-circle";
  };

  const getPermissionColor = (permission: PermissionStatus) => {
    if (permission.granted) return palette.success;
    if (!permission.canAskAgain) return palette.red;
    return palette.warning;
  };

  const getPermissionText = (permission: PermissionStatus) => {
    if (permission.granted) return "Concedido";
    if (!permission.canAskAgain) return "Denegado Permanentemente";
    return "No Concedido";
  };

  const handleLogout = () => {
    console.log("Logout initiated");
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setShowLogoutDialog(false);
    await logout();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Fecha no disponible";
    }
  };

  const getInitials = (name: string) => {
    return (name || "")
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text variant="bodyLarge">
            No se pudo cargar la información del usuario
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Header con avatar y nombre */}
        <Surface
          style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}
          elevation={2}
        >
          <View style={styles.avatarContainer}>
            <View style={{ alignItems: "flex-start" }}>
              <Text
                variant="headlineSmall"
                style={[styles.userName, { color: theme.colors.onSurface }]}
              >
                {user.name || "Cesar Yahir Alarcon"}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.userEmail,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {user.email || "correo@ejemplo.com"}
              </Text>
            </View>
            <Avatar.Text
              size={80}
              label={getInitials(user.name || "Cesar Yahir")}
              labelStyle={{ color: "#fff" }}
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
          </View>
        </Surface>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Card
            style={[
              styles.statCard,
              {
                backgroundColor: palette.success + "15",
                shadowColor: "transparent",
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="office-building"
                size={32}
                color={palette.success}
              />
              <Text
                variant="titleLarge"
                style={{
                  color: palette.success,
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {selectedCompany?.name || "N/A"}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary, textAlign: "center" }}
              >
                Compañía Activa
              </Text>
            </Card.Content>
          </Card>

          <Card
            style={[
              styles.statCard,
              {
                backgroundColor: palette.primary + "15",
              },
            ]}
          >
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons
                name="map-marker"
                size={32}
                color={palette.blue}
              />
              <Text
                variant="titleLarge"
                style={{
                  color: palette.blue,
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {location?.name || "N/A"}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary }}
              >
                Ubicación Activa
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Account Details */}
        <Card
          style={[styles.infoCard, { backgroundColor: palette.primary + "15" }]}
        >
          <Card.Content>
            <View style={styles.permissionHeader}>
              <MaterialCommunityIcons
                name="account-details"
                size={24}
                color={palette.primary}
              />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Detalles de la Cuenta
              </Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <MaterialCommunityIcons
                  name="identifier"
                  size={20}
                  color={palette.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Email verificado:
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.primary }}
                >
                  ✓ Verificado
                </Text>
              </View>
            </>
          )}
        </Surface>

        {/* Card de Compañía Actual */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Surface
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.surface, flex: 1 },
            ]}
            elevation={1}
          >
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Compañía Actual
            </Text>
            <View style={styles.infoRow}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.infoLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Nombre: {selectedCompany?.name || "No asignada"}
              </Text>
            </View>
          </Surface>
          {/* Card de Sucursal Actual */}
          <Surface
            style={[
              styles.infoCard,
              { backgroundColor: theme.colors.surface, flex: 1 },
            ]}
            elevation={1}
          >
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Sucursal Actual
            </Text>
            <View style={styles.infoRow}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.infoLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Nombre: {selectedLocation?.name || "No asignada"}
              </Text>
            </View>
            {/*    {selectedLocation?.address && (
              <View style={styles.infoRow}>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.infoLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  📍 {selectedLocation.address}
                </Text>
              </View>
            )} */}
          </Surface>
        </View>

        {/* Acciones */}
        <Surface
          style={[
            styles.actionsCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={1}
        >
          <Card.Content>
            <View style={styles.permissionHeader}>
              <MaterialCommunityIcons
                name="flash"
                size={24}
                color={palette.warning}
              />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Acciones Rápidas
              </Text>
            </View>

          <Button
            mode="outlined"
            onPress={() => {
              router.push("/(stacks)/selectCompany");
            }}
            style={styles.actionButton}
            icon="office-building"
          >
            Cambiar Compañía
          </Button>

          <Button
            mode="outlined"
            onPress={() => {
              router.push("/(stacks)/selectLocation");
            }}
            style={styles.actionButton}
            icon="map-marker"
          >
            Cambiar Ubicación
          </Button>

          <Button
            mode="outlined"
            onPress={() => {
              // TODO: Implementar cambio de contraseña
              Alert.alert(
                "Función no disponible",
                "Esta función se implementará próximamente"
              );
            }}
            style={styles.actionButton}
            icon="lock-outline"
          >
            Cambiar Contraseña
          </Button>

              <Card
                style={[
                  styles.actionItem,
                  { backgroundColor: palette.red + "15" },
                ]}
                onPress={handleLogout}
                disabled={isLoading}
              >
                <Card.Content style={styles.actionItemContent}>
                  <MaterialCommunityIcons
                    name="logout"
                    size={32}
                    color={palette.red}
                  />
                  <Text
                    variant="labelLarge"
                    style={{
                      color: palette.red,
                      fontWeight: "bold",
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    {isLoading ? "Saliendo..." : "Cerrar Sesión"}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          </Card.Content>
        </Card>

        {/* Permisos de la App */}
        <Card
          style={[
            styles.permissionsCard,
            { backgroundColor: palette.blue + "15" },
          ]}
        >
          <Card.Content>
            <View style={styles.permissionHeader}>
              <MaterialCommunityIcons
                name="shield-check"
                size={28}
                color={palette.blue}
              />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Permisos de la Aplicación
              </Text>
            </View>

            {loadingPermissions ? (
              <View style={styles.loadingPermissions}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text
                  variant="bodySmall"
                  style={{ color: palette.textSecondary, marginTop: 8 }}
                >
                  Verificando permisos...
                </Text>
              </View>
            ) : permissions ? (
              <View style={styles.permissionsGrid}>
                {/* Cámara */}
                <Card
                  style={[
                    styles.permissionCard,
                    { backgroundColor: palette.surface },
                  ]}
                  onPress={() =>
                    !permissions.camera.granted && requestPermission("camera")
                  }
                >
                  <Card.Content style={styles.permissionContent}>
                    <View style={styles.permissionIconContainer}>
                      <MaterialCommunityIcons
                        name="camera"
                        size={32}
                        color={getPermissionColor(permissions.camera)}
                      />
                      <MaterialCommunityIcons
                        name={getPermissionIcon(permissions.camera)}
                        size={20}
                        color={getPermissionColor(permissions.camera)}
                        style={styles.permissionStatusIcon}
                      />
                    </View>
                    <Text variant="titleMedium" style={styles.permissionTitle}>
                      Cámara
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.permissionStatus,
                        { color: getPermissionColor(permissions.camera) },
                      ]}
                    >
                      {getPermissionText(permissions.camera)}
                    </Text>
                    {!permissions.camera.granted &&
                      permissions.camera.canAskAgain && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.primary },
                          ]}
                        >
                          Toca para activar
                        </Text>
                      )}
                    {!permissions.camera.canAskAgain &&
                      !permissions.camera.granted && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.red },
                          ]}
                        >
                          Ir a ajustes
                        </Text>
                      )}
                  </Card.Content>
                </Card>

                {/* Notificaciones */}
                <Card
                  style={[
                    styles.permissionCard,
                    { backgroundColor: palette.surface },
                  ]}
                  onPress={() =>
                    !permissions.notifications.granted &&
                    requestPermission("notifications")
                  }
                >
                  <Card.Content style={styles.permissionContent}>
                    <View style={styles.permissionIconContainer}>
                      <MaterialCommunityIcons
                        name="bell"
                        size={32}
                        color={getPermissionColor(permissions.notifications)}
                      />
                      <MaterialCommunityIcons
                        name={getPermissionIcon(permissions.notifications)}
                        size={20}
                        color={getPermissionColor(permissions.notifications)}
                        style={styles.permissionStatusIcon}
                      />
                    </View>
                    <Text variant="titleMedium" style={styles.permissionTitle}>
                      Notificaciones
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.permissionStatus,
                        {
                          color: getPermissionColor(permissions.notifications),
                        },
                      ]}
                    >
                      {getPermissionText(permissions.notifications)}
                    </Text>
                    {!permissions.notifications.granted &&
                      permissions.notifications.canAskAgain && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.primary },
                          ]}
                        >
                          Toca para activar
                        </Text>
                      )}
                    {!permissions.notifications.canAskAgain &&
                      !permissions.notifications.granted && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.red },
                          ]}
                        >
                          Ir a ajustes
                        </Text>
                      )}
                  </Card.Content>
                </Card>

                {/* Ubicación */}
                <Card
                  style={[
                    styles.permissionCard,
                    { backgroundColor: palette.surface },
                  ]}
                  onPress={() =>
                    !permissions.location.granted &&
                    requestPermission("location")
                  }
                >
                  <Card.Content style={styles.permissionContent}>
                    <View style={styles.permissionIconContainer}>
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={32}
                        color={getPermissionColor(permissions.location)}
                      />
                      <MaterialCommunityIcons
                        name={getPermissionIcon(permissions.location)}
                        size={20}
                        color={getPermissionColor(permissions.location)}
                        style={styles.permissionStatusIcon}
                      />
                    </View>
                    <Text variant="titleMedium" style={styles.permissionTitle}>
                      Ubicación
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.permissionStatus,
                        { color: getPermissionColor(permissions.location) },
                      ]}
                    >
                      {getPermissionText(permissions.location)}
                    </Text>
                    {!permissions.location.granted &&
                      permissions.location.canAskAgain && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.primary },
                          ]}
                        >
                          Toca para activar
                        </Text>
                      )}
                    {!permissions.location.canAskAgain &&
                      !permissions.location.granted && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.red },
                          ]}
                        >
                          Ir a ajustes
                        </Text>
                      )}
                  </Card.Content>
                </Card>

                {/* Galería */}
                <Card
                  style={[
                    styles.permissionCard,
                    { backgroundColor: palette.surface },
                  ]}
                  onPress={() =>
                    !permissions.mediaLibrary.granted &&
                    requestPermission("mediaLibrary")
                  }
                >
                  <Card.Content style={styles.permissionContent}>
                    <View style={styles.permissionIconContainer}>
                      <MaterialCommunityIcons
                        name="image-multiple"
                        size={32}
                        color={getPermissionColor(permissions.mediaLibrary)}
                      />
                      <MaterialCommunityIcons
                        name={getPermissionIcon(permissions.mediaLibrary)}
                        size={20}
                        color={getPermissionColor(permissions.mediaLibrary)}
                        style={styles.permissionStatusIcon}
                      />
                    </View>
                    <Text variant="titleMedium" style={styles.permissionTitle}>
                      Galería
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.permissionStatus,
                        { color: getPermissionColor(permissions.mediaLibrary) },
                      ]}
                    >
                      {getPermissionText(permissions.mediaLibrary)}
                    </Text>
                    {!permissions.mediaLibrary.granted &&
                      permissions.mediaLibrary.canAskAgain && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.primary },
                          ]}
                        >
                          Toca para activar
                        </Text>
                      )}
                    {!permissions.mediaLibrary.canAskAgain &&
                      !permissions.mediaLibrary.granted && (
                        <Text
                          variant="labelSmall"
                          style={[
                            styles.permissionAction,
                            { color: palette.red },
                          ]}
                        >
                          Ir a ajustes
                        </Text>
                      )}
                  </Card.Content>
                </Card>
              </View>
            ) : (
              <Text
                variant="bodySmall"
                style={{ color: palette.textSecondary, textAlign: "center" }}
              >
                No se pudieron cargar los permisos
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            PlastiGest v{process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0"}
          </Text>
        </View>
      </ScrollView>

      {/* Diálogo de confirmación de logout */}
      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Cerrar Sesión</Dialog.Title>
          <Dialog.Content>
            <Text>¿Estás seguro de que quieres cerrar sesión?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancelar</Button>
            <Button onPress={confirmLogout} textColor={theme.colors.error}>
              Cerrar Sesión
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  headerCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 24,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  avatar: {
    marginBottom: 16,
  },
  userName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  userEmail: {
    textAlign: "center",
  },
  infoCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  actionsCard: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: palette.text,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.surface,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: palette.card,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionItem: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  actionItemContent: {
    alignItems: "center",
    paddingVertical: 20,
  },
  permissionIconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  permissionStatusIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: palette.surface,
    borderRadius: 10,
  },
  permissionTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  permissionStatus: {
    fontWeight: "600",
    textAlign: "center",
  },
  permissionAction: {
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
  permissionsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  loadingPermissions: {
    alignItems: "center",
    paddingVertical: 20,
  },
  permissionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  permissionCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary + "20",
    shadowOffset: { width: 0, height: 0 },
    shadowColor: "transparent",
  },
  permissionContent: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  permissionIconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  permissionStatusIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: palette.surface,
    borderRadius: 10,
  },
  permissionTitle: {
    fontWeight: "bold",
    textAlign: "center",
  },
  permissionStatus: {
    fontWeight: "600",
    textAlign: "center",
  },
  permissionAction: {
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
});
