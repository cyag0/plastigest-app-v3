import UserFormShared from "@/components/screens/UserFormShared";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams } from "expo-router";

export default function CompanyUserFormScreen() {
  const params = useLocalSearchParams();
  const userId = params.id ? parseInt(params.id as string) : undefined;
  const { selectedCompany } = useAuth();

  return (
    <UserFormShared
      id={userId}
      mode="company"
      companyId={selectedCompany?.id}
    />
  );
}
