import UserFormShared from "@/components/screens/UserFormShared";
import { useLocalSearchParams } from "expo-router";

export default function UsersForm() {
  const params = useLocalSearchParams();
  const userId = params.id ? parseInt(params.id as string) : undefined;

  return <UserFormShared id={userId} mode="global" />;
}
