import UserFormShared from "@/components/screens/UserFormShared";
import { useLocalSearchParams } from "expo-router";

interface UsersFormProps {
  id?: number;
}

export default function UsersForm(props: UsersFormProps) {
  const params = useLocalSearchParams();
  const userId = props.id ?? (params.id ? parseInt(params.id as string) : undefined);

  return <UserFormShared id={userId} mode="global" />;
}
