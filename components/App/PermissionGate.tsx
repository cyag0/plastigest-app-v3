/**
 * PermissionGate — muestra una pantalla de "Sin acceso" si el usuario
 * no tiene el permiso requerido. De lo contrario renderiza los children.
 */
import { useAuth } from "@/contexts/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import palette from "@/constants/palette";

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
}

export default function PermissionGate({
  permission,
  children,
}: PermissionGateProps) {
  const { hasPermission, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) return null;

  if (!hasPermission(permission)) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons
          name="lock-outline"
          size={72}
          color={palette.textSecondary}
        />
        <Text variant="titleLarge" style={styles.title}>
          Acceso restringido
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          No tienes permiso para ver esta sección.{"\n"}Contacta a tu
          administrador.
        </Text>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.button}
          textColor={palette.primary}
        >
          Volver
        </Button>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
    backgroundColor: palette.background,
  },
  title: {
    fontWeight: "bold",
    color: palette.text,
    textAlign: "center",
  },
  subtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  button: {
    marginTop: 8,
    borderColor: palette.primary,
  },
});
