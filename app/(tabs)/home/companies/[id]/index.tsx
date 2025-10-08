import { useLocalSearchParams } from "expo-router";
import CompaniesForm from "../form";

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CompaniesForm id={Number(id)} readonly />;
}
