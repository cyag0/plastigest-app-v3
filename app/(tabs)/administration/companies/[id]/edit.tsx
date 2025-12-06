import CompaniesForm from "@/app/(tabs)/home/companies/form";
import { useLocalSearchParams } from "expo-router";

export default function EditCompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CompaniesForm id={Number(id)} />;
}
