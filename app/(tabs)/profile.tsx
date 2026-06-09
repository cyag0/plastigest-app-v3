import AppBar from "@/components/App/AppBar";
import AppChip from "@/components/App/Chip";
import ContextSwitcherModal from "@/components/App/ContextSwitcherModal";
import EmptyState from "@/components/App/EmptyState";
import SectionHeader from "@/components/App/SectionHeader";
import QuickAccessCard from "@/components/Dashboard/QuickAccessCard";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Importaciones dinamicas para evitar errores de tipos
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

type PermissionTone = "success" | "warning" | "error";

const PERMISSION_META: {
  key: keyof AppPermissions;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: "camera", label: "Camara", icon: "camera-outline" },
  { key: "notifications", label: "Notificaciones", icon: "bell-outline" },
  { key: "location", label: "Ubicacion", icon: "map-marker-outline" },
  { key: "mediaLibrary", label: "Galeria", icon: "image-multiple-outline" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { user, logout, isLoading, selectedCompany, location, permissions: userPermissions } =
    useAuth();
  const { colors } = useTheme();
  const [permissions, setPermissions] = useState<AppPermissions | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  // Modal de cambio de empresa/sucursal. Antes estos botones
  // empujaban a `/(stacks)/selectCompany` y `/(stacks)/selectLocation`,
  // saliendo del tab de Perfil. Ahora se abren sobre la misma pantalla.
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switcherInitialView, setSwitcherInitialView] = useState<
    "company" | "location"
  >("company");

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
            "Has denegado este permiso permanentemente. Para activarlo, ve a la configuracion de la aplicacion.",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Abrir Configuracion",
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

  const getPermissionTone = (p: PermissionStatus): PermissionTone => {
    if (p.granted) return "success";
    if (!p.canAskAgain) return "error";
    return "warning";
  };

  const getPermissionText = (p: PermissionStatus) => {
    if (p.granted) return "Concedido";
    if (!p.canAskAgain) return "Bloqueado";
    return "No concedido";
  };

  const handleLogout = async () => {
    const confirmed = await alerts.confirm(
      "¿Estas seguro de que quieres cerrar sesion?",
      {
        title: "Cerrar sesion",
        okText: "Salir",
        cancelText: "Cancelar",
      },
    );
    if (confirmed) {
      await logout();
    }
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

  const role = user?.roles?.[0]?.name || "Usuario";
  const initials = getInitials(user?.name || "Usuario");
  const memberSince = user?.created_at ? formatDate(user.created_at) : "N/A";
  const lastUpdate = user?.updated_at ? formatDate(user.updated_at) : "N/A";
  const grantedPermissions = userPermissions?.length ?? 0;

  const styles = useThemedStyles((c) => ({
    safe: {
      flex: 1,
      backgroundColor: c.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: tokens.spacing[10],
    },
    headerCard: {
      backgroundColor: c.surface,
      marginHorizontal: tokens.spacing[5],
      marginTop: tokens.spacing[5],
      marginBottom: tokens.spacing[4],
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[5],
      ...tokens.shadow.sm,
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[4],
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: tokens.radius.full,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    avatarInitials: {
      color: c.primaryForeground,
      fontSize: 24,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    headerInfo: {
      flex: 1,
      minWidth: 0,
      gap: tokens.spacing[2],
    },
    headerName: {
      ...tokens.typography.h1,
      color: c.text,
    },
    headerMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[2],
    },
    emailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    email: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
      flexShrink: 1,
    },
    contextRow: {
      flexDirection: "row",
      gap: tokens.spacing[3],
      paddingHorizontal: tokens.spacing[5],
      marginBottom: tokens.spacing[5],
    },
    contextTile: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      gap: tokens.spacing[2],
      minWidth: 0,
      ...tokens.shadow.sm,
    },
    contextIconBox: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    contextLabel: {
      ...tokens.typography.micro,
      color: c.textMuted,
    },
    contextValue: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    contextSub: {
      ...tokens.typography.caption,
      color: c.textSecondary,
    },
    section: {
      paddingHorizontal: tokens.spacing[5],
      marginBottom: tokens.spacing[5],
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      ...tokens.shadow.sm,
      overflow: "hidden",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.spacing[4],
      gap: tokens.spacing[3],
    },
    infoIconBox: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    infoLabel: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
    infoValue: {
      ...tokens.typography.bodyMd,
      color: c.text,
      marginTop: 1,
    },
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginLeft: tokens.spacing[4] + 32 + tokens.spacing[3],
    },
    permissionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[3],
    },
    permissionCard: {
      flexBasis: "48%",
      flexGrow: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[3],
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[3] + 2,
      minHeight: 64,
      ...tokens.shadow.sm,
    },
    permissionIconBox: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.md,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    permissionBody: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    permissionLabel: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    permissionRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.spacing[4],
      gap: tokens.spacing[3],
    },
    skeletonTitle: {
      width: 100,
      height: 12,
      borderRadius: 4,
      backgroundColor: c.surfaceMuted,
      marginBottom: 6,
    },
    skeletonSub: {
      width: 60,
      height: 16,
      borderRadius: tokens.radius.full,
      backgroundColor: c.surfaceMuted,
    },
    actionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.spacing[3],
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      gap: tokens.spacing[3],
      ...tokens.shadow.sm,
    },
    logoutIcon: {
      width: 36,
      height: 36,
      borderRadius: tokens.radius.md,
      backgroundColor: colors.errorSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutLabel: {
      ...tokens.typography.bodyMd,
      color: colors.error,
      flex: 1,
    },
    footer: {
      alignItems: "center",
      paddingVertical: tokens.spacing[6],
      gap: 4,
    },
    footerText: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
    footerSubtext: {
      ...tokens.typography.caption,
      color: c.textMuted,
      opacity: 0.7,
    },
  }));

  return (
    <SafeAreaView style={styles.safe}>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ============== HEADER CARD ============== */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {user?.name || "Usuario"}
              </Text>
              <View style={styles.headerMetaRow}>
                <AppChip variant="primary" size="sm" icon="shield-account">
                  {role}
                </AppChip>
                {user?.email_verified_at ? (
                  <AppChip variant="success" size="sm" icon="check-circle">
                    Verificado
                  </AppChip>
                ) : (
                  <AppChip variant="warning" size="sm" icon="alert-circle">
                    Sin verificar
                  </AppChip>
                )}
              </View>
              <View style={styles.emailRow}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={14}
                  color={colors.textMuted}
                />
                <Text style={styles.email} numberOfLines={1}>
                  {user?.email || "sin-correo@plastigest.com"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ============== CONTEXTO ACTIVO (empresa/sucursal) ============== */}
        <View style={styles.contextRow}>
          <ContextTile
            icon="office-building-outline"
            label="Empresa"
            value={selectedCompany?.name || "Sin empresa"}
            sublabel={selectedCompany?.business_name || undefined}
            tone="primary"
          />
          <ContextTile
            icon="map-marker-outline"
            label="Sucursal"
            value={location?.name || "Sin sucursal"}
            sublabel={location?.address || undefined}
            tone="info"
          />
        </View>

        {/* ============== DETALLES DE LA CUENTA ============== */}
        <View style={styles.section}>
          <SectionHeader
            title="Detalles de la cuenta"
            badge={`#${user?.id ?? "—"}`}
          />
          <View style={styles.card}>
            <InfoRow
              icon="identifier"
              label="ID de usuario"
              value={`#${user?.id ?? "—"}`}
              tone="primary"
            />
            <Divider />
            <InfoRow
              icon="calendar-plus"
              label="Miembro desde"
              value={memberSince}
              tone="success"
            />
            <Divider />
            <InfoRow
              icon="update"
              label="Ultima actualizacion"
              value={lastUpdate}
              tone="info"
            />
            <Divider />
            <InfoRow
              icon="shield-key-outline"
              label="Permisos del sistema"
              value={`${grantedPermissions} permiso${grantedPermissions === 1 ? "" : "s"}`}
              tone="warning"
            />
          </View>
        </View>

        {/* ============== PERMISOS DE LA APLICACION ============== */}
        <View style={styles.section}>
          <SectionHeader
            title="Permisos del dispositivo"
            actionLabel="Reverificar"
            onAction={checkPermissions}
          />

          {loadingPermissions ? (
            <View style={styles.card}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.permissionRow}>
                  <View style={styles.permissionIconBox} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.skeletonTitle} />
                    <View style={styles.skeletonSub} />
                  </View>
                </View>
              ))}
            </View>
          ) : permissions ? (
            <View style={styles.permissionsGrid}>
              {PERMISSION_META.map((meta) => {
                const p = permissions[meta.key];
                const tone = getPermissionTone(p);
                const blocked = !p.granted && !p.canAskAgain;
                return (
                  <TouchableOpacity
                    key={meta.key}
                    activeOpacity={0.7}
                    onPress={() => !p.granted && requestPermission(meta.key)}
                    style={styles.permissionCard}
                  >
                    <View
                      style={[
                        styles.permissionIconBox,
                        {
                          backgroundColor:
                            tone === "success"
                              ? colors.successSoft
                              : tone === "warning"
                              ? colors.warningSoft
                              : colors.errorSoft,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={meta.icon}
                        size={20}
                        color={
                          tone === "success"
                            ? colors.success
                            : tone === "warning"
                            ? colors.warning
                            : colors.error
                        }
                      />
                    </View>
                    <View style={styles.permissionBody}>
                      <Text style={styles.permissionLabel}>{meta.label}</Text>
                      <AppChip
                        variant={tone === "success" ? "success" : tone === "warning" ? "warning" : "error"}
                        size="sm"
                      >
                        {getPermissionText(p)}
                      </AppChip>
                    </View>
                    {!p.granted && p.canAskAgain && (
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={18}
                        color={colors.textMuted}
                      />
                    )}
                    {blocked && (
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => Linking.openSettings()}
                      >
                        <MaterialCommunityIcons
                          name="cog-outline"
                          size={18}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.card}>
              <EmptyState
                compact
                icon="shield-off-outline"
                title="No se pudieron cargar los permisos"
                description="Intenta de nuevo desde Reverificar"
              />
            </View>
          )}
        </View>

        {/* ============== ACCIONES RAPIDAS ============== */}
        <View style={styles.section}>
          <SectionHeader title="Acciones rapidas" />
          <View style={styles.actionsGrid}>
            <QuickAccessCard
              icon="office-building-outline"
              label="Cambiar empresa"
              description="Selecciona otra compania"
              onPress={() => {
                setSwitcherInitialView("company");
                setSwitcherVisible(true);
              }}
            />
            <QuickAccessCard
              icon="map-marker-outline"
              label="Cambiar sucursal"
              description="Ubicacion activa"
              onPress={() => {
                setSwitcherInitialView("location");
                setSwitcherVisible(true);
              }}
            />
            <QuickAccessCard
              icon="cog-outline"
              label="Preferencias"
              description="Tema, densidad y comportamiento"
              onPress={() => router.push("/(tabs)/preferences" as any)}
            />
            <QuickAccessCard
              icon="lock-reset"
              label="Cambiar contrasena"
              description="Actualiza tu clave"
              onPress={() => router.push("/(stacks)/change-password" as any)}
            />
          </View>
        </View>

        {/* ============== CERRAR SESION ============== */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoading}
          >
            <View style={styles.logoutIcon}>
              <MaterialCommunityIcons
                name="logout"
                size={18}
                color={colors.error}
              />
            </View>
            <Text style={styles.logoutLabel}>
              {isLoading ? "Saliendo..." : "Cerrar sesion"}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* ============== FOOTER ============== */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PlastiGest v{process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0"}
          </Text>
          <Text style={styles.footerSubtext}>
            Hecho con {"\u{1F33F}"} para la gestion de tu negocio
          </Text>
        </View>
      </ScrollView>

      {/* Modal de cambio de empresa/sucursal. Reemplaza los
          router.push a las pantallas /selectCompany y /selectLocation
          para que el usuario no pierda el tab de Perfil. */}
      <ContextSwitcherModal
        visible={switcherVisible}
        onDismiss={() => setSwitcherVisible(false)}
        initialView={switcherInitialView}
      />
    </SafeAreaView>
  );
}

// ============== SUBCOMPONENTES ==============

function Divider() {
  const styles = useThemedStyles((c) => ({
    divider: {
      height: 1,
      backgroundColor: c.border,
      marginLeft: tokens.spacing[4] + 32 + tokens.spacing[3],
    },
  }));
  return <View style={styles.divider} />;
}

interface ContextTileProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  sublabel?: string;
  tone: "primary" | "info" | "success" | "warning" | "error";
}

function ContextTile({ icon, label, value, sublabel, tone }: ContextTileProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    contextTile: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing[4],
      gap: tokens.spacing[2],
      minWidth: 0,
      ...tokens.shadow.sm,
    },
    contextIconBox: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    contextLabel: {
      ...tokens.typography.micro,
      color: c.textMuted,
    },
    contextValue: {
      ...tokens.typography.bodyMd,
      color: c.text,
    },
    contextSub: {
      ...tokens.typography.caption,
      color: c.textSecondary,
    },
  }));

  const tonePalette = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    error: { bg: colors.errorSoft, fg: colors.error },
  }[tone];

  return (
    <View style={styles.contextTile}>
      <View style={[styles.contextIconBox, { backgroundColor: tonePalette.bg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={tonePalette.fg} />
      </View>
      <Text style={styles.contextLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.contextValue} numberOfLines={1}>
        {value}
      </Text>
      {sublabel ? (
        <Text style={styles.contextSub} numberOfLines={1}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

interface InfoRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  tone: "primary" | "info" | "success" | "warning" | "error";
}

function InfoRow({ icon, label, value, tone }: InfoRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: tokens.spacing[4],
      gap: tokens.spacing[3],
    },
    infoIconBox: {
      width: 32,
      height: 32,
      borderRadius: tokens.radius.sm,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    infoLabel: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
    infoValue: {
      ...tokens.typography.bodyMd,
      color: c.text,
      marginTop: 1,
    },
  }));
  const tonePalette = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    error: { bg: colors.errorSoft, fg: colors.error },
  }[tone];

  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconBox, { backgroundColor: tonePalette.bg }]}>
        <MaterialCommunityIcons name={icon} size={16} color={tonePalette.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ============== STYLES ==============


// Hack visual: la transicion de hover en web para las cards
if (Platform.OS === "web") {
  // no-op: tokens.shadow.sm se aplica estaticamente
}
