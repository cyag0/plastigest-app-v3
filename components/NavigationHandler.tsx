import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

export default function NavigationHandler({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // No hacer nada mientras carga

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "(stacks)";

    if (isAuthenticated && !inAuthGroup) {
      // Usuario autenticado pero no en tabs, redirigir a home
      router.replace("/(tabs)/home");
    } else if (!isAuthenticated && inAuthGroup) {
      // Usuario no autenticado pero en tabs, redirigir a login
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, segments]);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Verificando autenticación...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
