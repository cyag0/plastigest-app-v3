import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";

interface CompanyRequiredWrapperProps {
  children: React.ReactNode;
}

export default function CompanyRequiredWrapper({
  children,
}: CompanyRequiredWrapperProps) {
  const { isAuthenticated, hasCompanySelected, companies, isLoadingCompanies } =
    useAuth();
  const router = useRouter();

  console.log("CompanyRequiredWrapper - isAuthenticated:", isAuthenticated);

  useEffect(() => {
    // Solo verificar si el usuario está autenticado y no está cargando compañías
    if (isAuthenticated && !isLoadingCompanies) {
      // Si no hay compañía seleccionada pero hay compañías disponibles
      if (!hasCompanySelected && companies.length > 0) {
        router.push("/(stacks)/selectCompany");
      }
      // Si no hay compañías disponibles, mostrar mensaje o redirigir a configuración
      else if (companies.length === 0) {
        // Aquí podrías mostrar un mensaje de error o redirigir a una página de configuración
        console.warn("No hay compañías disponibles para este usuario");
      }
    }
  }, [
    isAuthenticated,
    hasCompanySelected,
    companies,
    isLoadingCompanies,
    router,
  ]);

  return <>{children}</>;
}
