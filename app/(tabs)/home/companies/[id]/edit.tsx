import { useLocalSearchParams } from "expo-router";
import CompaniesForm from "../form";

export default function EditCompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CompaniesForm id={Number(id)} />;
}
