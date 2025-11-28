import { useLocalSearchParams } from "expo-router";
import UsersForm from "../form";

export default function UserDetailScreen() {
  const params = useLocalSearchParams();
  const id = params.id ? parseInt(params.id as string) : undefined;

  return <UsersForm id={id} readonly />;
}
