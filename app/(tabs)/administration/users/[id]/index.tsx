import UserDetailScreen from "@/components/Administration/Users/UserDetailScreen";
import { useLocalSearchParams } from "expo-router";

export default function UserDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <UserDetailScreen id={Number(id)} scope="global" />;
}
