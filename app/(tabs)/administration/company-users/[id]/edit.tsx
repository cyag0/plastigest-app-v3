import UserFormShared from "@/components/screens/UserFormShared";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalSearchParams } from "expo-router";

export default function CompanyUserEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedCompany } = useAuth();

  return <UserFormShared id={Number(id)} mode="company" companyId={selectedCompany?.id} />;
}
