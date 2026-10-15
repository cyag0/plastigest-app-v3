import { formatDate as formatCalendarDate } from "@/utils/dates";
import ContextSwitcherModal from "@/components/App/ContextSwitcherModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";

interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

// Solo los permisos que la app usa de verdad: cámara (escáner de códigos y
// fotos) y notificaciones. La galería no necesita permiso (selector del
// sistema) y la app no usa ubicación.
interface AppPermissions {
  camera: PermissionStatus;
  notifications: PermissionStatus;
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const PERMISSION_META: {
  key: keyof AppPermissions;
  label: string;
  icon: IconName;
}[] = [
  { key: "camera", label: "Cámara", icon: "camera-outline" },
  { key: "notifications", label: "Notificaciones", icon: "bell-outline" },
];

/**
 * Perfil: quién eres, dónde estás trabajando y lo que puedes cambiar.
 *
 * Antes era una tarjeta con chips (rol, "Verificado"), dos tiles de
 * contexto, una tarjeta de "Detalles de la cuenta" con ID y fechas, tarjetas
 * de permisos con íconos de color y una cuadrícula de accesos rápidos que
 * repetía Empresa/Sucursal. Ahora son listas agrupadas, una fila por cosa.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const { user, logout, isLoading, selectedCompany, location } = useAuth();
  const { colors } = useTheme();
  const [permissions, setPermissions] = useState<AppPermissions | null>(null);
  const [permissionsFailed, setPermissionsFailed] = useState(false);
  // Empresa y sucursal se cambian en un modal, sin salir de Perfil.
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [switcherInitialView, setSwitcherInitialView] = useState<
    "company" | "location"
  >("company");

  const checkPermissions = useCallback(async () => {
    try {
      const [cameraStatus, notificationStatus] = await Promise.all([
        Camera.getCameraPermissionsAsync(),
        Notifications.getPermissionsAsync(),
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
      });
      setPermissionsFailed(false);
    } catch (error) {
      console.error("Error checking permissions:", error);
      setPermissionsFailed(true);
    }
  }, []);

  // Se revisa al volver a la pantalla: si el usuario activó un permiso en
  // los ajustes del teléfono, aquí ya sale actualizado (antes había un botón
  // "Reverificar").
  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [checkPermissions]),
  );

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

  const handleLogout = async () => {
    const confirmed = await alerts.confirm(
      "¿Estás seguro de que quieres cerrar sesión?",
      {
        title: "Cerrar sesión",
        okText: "Salir",
        cancelText: "Cancelar",
      },
    );
    if (confirmed) {
      await logout();
    }
  };

  const openSwitcher = (view: "company" | "location") => {
    setSwitcherInitialView(view);
    setSwitcherVisible(true);
  };

  const initials = (user?.name || "Usuario")
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .substring(0, 2);
  const role = user?.roles?.[0]?.name;
  const memberSince = user?.created_at ? formatCalendarDate(user.created_at, "long") : null;
  const version = process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0";

  const styles = useThemedStyles((c) => ({
    scroll: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 16,
      paddingBottom: 32,
      gap: 8,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 8,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInitials: {
      color: c.primaryHover,
      fontSize: 20,
      fontWeight: "700",
    },
    name: {
      fontSize: 20,
      fontWeight: "700",
      color: c.text,
    },
    email: {
      fontSize: 14,
      color: c.textSecondary,
      marginTop: 2,
    },
    role: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 2,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: c.textSecondary,
      marginTop: 14,
    },
    group: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    footer: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: "center",
      marginTop: 16,
    },
  }));

  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || "Usuario"}
            </Text>
            {!!user?.email && (
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            )}
            {!!role && <Text style={styles.role}>{role}</Text>}
          </View>
        </View>

        <Text style={styles.groupTitle}>Trabajando en</Text>
        <View style={styles.group}>
          <Row
            icon="office-building-outline"
            title="Empresa"
            value={selectedCompany?.name || "Elegir"}
            onPress={() => openSwitcher("company")}
          />
          <Row
            divider
            icon="map-marker-outline"
            title="Sucursal"
            value={location?.name || "Elegir"}
            onPress={() => openSwitcher("location")}
          />
        </View>

        <Text style={styles.groupTitle}>Cuenta</Text>
        <View style={styles.group}>
          <Row
            icon="history"
            title="Mi actividad"
            onPress={() => router.push("/(stacks)/activity" as any)}
          />
          <Row
            divider
            icon="lock-outline"
            title="Cambiar contraseña"
            onPress={() => router.push("/(stacks)/change-password" as any)}
          />
          <Row
            divider
            icon="tune-variant"
            title="Preferencias"
            onPress={() => router.push("/(tabs)/preferences" as any)}
          />
          <Row
            divider
            icon="help-circle-outline"
            title="Ayuda"
            onPress={() => router.push("/(stacks)/help" as any)}
          />
        </View>

        <Text style={styles.groupTitle}>Este dispositivo</Text>
        <View style={styles.group}>
          {PERMISSION_META.map((meta, index) => {
            const p = permissions?.[meta.key];
            const blocked = !!p && !p.granted && !p.canAskAgain;
            let value = permissionsFailed ? "No disponible" : "…";
            let tone: string = colors.textMuted;
            if (p?.granted) {
              value = "Permitido";
            } else if (blocked) {
              value = "Bloqueado";
              tone = colors.error;
            } else if (p) {
              value = "Permitir";
              tone = colors.primary;
            }
            return (
              <Row
                key={meta.key}
                divider={index > 0}
                icon={meta.icon}
                title={meta.label}
                value={value}
                valueColor={tone}
                chevron={!!p && !p.granted}
                onPress={
                  !p || p.granted
                    ? undefined
                    : blocked
                      ? () => Linking.openSettings()
                      : () => requestPermission(meta.key)
                }
              />
            );
          })}
        </View>

        <View style={[styles.group, { marginTop: 22 }]}>
          <Row
            icon="logout"
            title={isLoading ? "Saliendo..." : "Cerrar sesión"}
            danger
            chevron={false}
            onPress={isLoading ? undefined : handleLogout}
          />
        </View>

        <Text style={styles.footer}>
          {memberSince ? `Miembro desde ${memberSince} · ` : ""}GCStock v{version}
        </Text>
      </ScrollView>

      <ContextSwitcherModal
        visible={switcherVisible}
        onDismiss={() => setSwitcherVisible(false)}
        initialView={switcherInitialView}
      />
    </>
  );
}

/** Fila de lista: ícono neutro, título, valor opcional a la derecha. */
function Row({
  icon,
  title,
  value,
  valueColor,
  divider,
  danger,
  chevron = true,
  onPress,
}: {
  icon: IconName;
  title: string;
  value?: string;
  valueColor?: string;
  divider?: boolean;
  danger?: boolean;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    divider: {
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    title: {
      fontSize: 15,
      fontWeight: "500",
      color: c.text,
    },
    value: {
      flex: 1,
      fontSize: 14,
      color: c.textMuted,
      textAlign: "right",
    },
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={danger ? colors.error : colors.textSecondary}
      />
      <Text style={[styles.title, danger && { color: colors.error }]}>{title}</Text>
      <Text
        style={[styles.value, valueColor ? { color: valueColor } : null]}
        numberOfLines={1}
      >
        {value ?? ""}
      </Text>
      {chevron && (
        <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
      )}
    </Pressable>
  );
}
