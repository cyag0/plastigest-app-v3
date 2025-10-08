import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook personalizado para obtener información de la compañía seleccionada
 * Proporciona una interfaz simple para acceder a los datos de la compañía
 */
export function useSelectedCompany() {
  const {
    selectedCompany,
    companies,
    hasCompanySelected,
    selectCompany,
    clearCompanySelection,
    isLoadingCompanies,
  } = useAuth();

  return {
    // Datos de la compañía actual
    company: selectedCompany,
    companyId: selectedCompany?.id,
    companyName: selectedCompany?.name,
    companyRFC: selectedCompany?.rfc,
    companyEmail: selectedCompany?.email,
    companyPhone: selectedCompany?.phone,
    companyAddress: selectedCompany?.address,
    isCompanyActive: selectedCompany?.is_active,

    // Lista de compañías disponibles
    availableCompanies: companies,

    // Estados
    hasCompany: hasCompanySelected,
    isLoading: isLoadingCompanies,

    // Acciones
    selectCompany,
    clearCompany: clearCompanySelection,

    // Utilidades
    isCurrentCompany: (companyId: number) => selectedCompany?.id === companyId,
  };
}

export default useSelectedCompany;
