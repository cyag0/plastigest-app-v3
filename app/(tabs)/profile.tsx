import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Avatar,
  Button,
  Divider,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout, isLoading, selectedCompany } = useAuth();

  const handleLogout = () => {
    console.log("Logout initiated");

    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Cerrar Sesión",
          style: "destructive",
          onPress: logout,
        },
      ]
    );
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

        {/* Información del perfil */}
        <Surface
          style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}
          elevation={1}
        >
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Información del Perfil
          </Text>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={[
                styles.infoLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              ID de Usuario:
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {user.id}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={[
                styles.infoLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Fecha de registro:
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {formatDate(user.created_at)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              variant="bodyMedium"
              style={[
                styles.infoLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Última actualización:
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
            >
              {formatDate(user.updated_at)}
            </Text>
          </View>

          {user.email_verified_at && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.infoRow}>
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
                Nombre:
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurface }}
              >
                {"No asignada"}
              </Text>
            </View>
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
          <Text
            variant="titleMedium"
            style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
          >
            Acciones
          </Text>

          <Button
            mode="outlined"
            onPress={() => {
              router.push("/(stacks)/selectCompany");
            }}
            style={styles.actionButton}
            icon="building"
          >
            Cambiar Compañía
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

          <Button
            mode="contained"
            onPress={handleLogout}
            style={[styles.actionButton, styles.logoutButton]}
            buttonColor={theme.colors.error}
            icon="logout"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? "Cerrando sesión..." : "Cerrar Sesión"}
          </Button>
        </Surface>

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
    fontWeight: "600",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    flex: 1,
  },
  divider: {
    marginVertical: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  logoutButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
  },
});
