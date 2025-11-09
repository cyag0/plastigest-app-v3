import ClienteForm from "../form";
import { useLocalSearchParams } from "expo-router";

export default function ClienteEditScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return <ClienteForm id={Number(id)} />;
}
