import LocationSelector from "@/components/LocationSelector";
import palette from "@/constants/palette";
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
  const {
    user,
    isLoading,
    hasCompanySelected,
    companies,
    isLoadingCompanies,
    selectedCompany,
    location,
  } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // No hacer nada mientras carga autenticación

    const inAuthGroup = segments[0] === "(tabs)" || segments[0] === "(stacks)";
    const inLogin = segments[0] === "login" || !segments[0];

    // 1. Verificar autenticación
    if (!user && inAuthGroup) {
      // Usuario no autenticado intentando acceder a rutas protegidas
      router.replace("/login");
      return;
    }

    if (user && inLogin) {
      // Usuario autenticado en login, redirigir a home
      router.replace("/(tabs)/home");
      return;
    }

    // 2. Verificar compañía (solo si está autenticado y no está cargando)
    if (user && !isLoadingCompanies) {
      // Si no hay compañía seleccionada pero hay compañías disponibles
      if (
        !hasCompanySelected &&
        companies.length > 0 &&
        segments[1] !== "selectCompany"
      ) {
        router.push("/(stacks)/selectCompany");
        return;
      }
    }
  }, [
    user,
    isLoading,
    isLoadingCompanies,
    hasCompanySelected,
    companies.length,
    segments,
  ]);

  // Mostrar loading mientras se verifica autenticación
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.loadingText}>Verificando autenticación...</Text>
      </View>
    );
  }

  // Si no hay usuario, mostrar children (login)
  if (!user) {
    return <>{children}</>;
  }

  // Si no hay compañía seleccionada, mostrar children (se redirigirá a selectCompany en el useEffect)
  if (!selectedCompany) {
    return <>{children}</>;
  }

  // Si no hay ubicación seleccionada, mostrar selector
  if (!location) {
    return (
      <View style={styles.container}>
        <LocationSelector onLocationSelected={() => {}} />
      </View>
    );
  }

  // Todo OK, mostrar la app
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: palette.text,
  },
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
});
