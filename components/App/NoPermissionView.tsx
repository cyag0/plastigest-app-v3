/**
 * Vista "sin permiso". La muestran el guard de rutas (al entrar por URL
 * directa o deep link a una pantalla sin permiso) y PermissionGate. Mismo
 * estilo tranquilo que Inicio y AppList: un ícono, un título corto, una línea
 * de texto y dos botones simples. Usa los colores del tema (modo oscuro).
 */
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Button, Text } from "react-native-paper";

/** A dónde lleva "Ir al inicio" (y "Volver" cuando no hay historial). */
export const HOME_ROUTE = "/(tabs)/home";

export interface NoPermissionViewProps {
  title?: string;
  description?: string;
  /**
   * Lo que pide la pantalla ("sales_read o sales_pos"). Solo se muestra en
   * desarrollo, para ubicar rápido qué permiso falta.
   */
  requiredPermissions?: string;
  /** false: sin "Volver" ni "Ir al inicio" (p. ej. para una sección dentro de una pantalla). */
  showActions?: boolean;
}

export default function NoPermissionView({
  title = "No tienes permiso para ver esta sección",
  description = "Si lo necesitas, pide acceso a tu administrador.",
  requiredPermissions,
  showActions = true,
}: NoPermissionViewProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
      gap: 8,
      backgroundColor: c.background,
    },
    title: {
      color: c.text,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 8,
    },
    description: {
      color: c.textSecondary,
      textAlign: "center",
      maxWidth: 360,
    },
    hint: {
      color: c.textMuted,
      textAlign: "center",
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      marginTop: 16,
    },
  }));

  // Sin historial (URL directa en web, deep link) "Volver" lleva al inicio:
  // subir un nivel podía caer en otra pantalla sin permiso.
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(HOME_ROUTE as any);
    }
  };

  return (
    <View style={styles.container} accessibilityRole="alert">
      <MaterialCommunityIcons name="lock-outline" size={48} color={colors.textMuted} />
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.description}>
        {description}
      </Text>
      {__DEV__ && !!requiredPermissions && (
        <Text variant="bodySmall" style={styles.hint}>
          Requiere: {requiredPermissions}
        </Text>
      )}
      {showActions && (
        <View style={styles.actions}>
          <Button mode="outlined" onPress={handleBack} textColor={colors.primary}>
            Volver
          </Button>
          <Button
            mode="text"
            onPress={() => router.replace(HOME_ROUTE as any)}
            textColor={colors.primary}
          >
            Ir al inicio
          </Button>
        </View>
      )}
    </View>
  );
}
