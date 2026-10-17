import RegisterWizard from "@/components/Production/RegisterWizard";
import { useLocalSearchParams } from "expo-router";

/** Continuar una producción pendiente (guardada "para después"). */
export default function EditProduction() {
  const params = useLocalSearchParams<{ id: string }>();
  return <RegisterWizard orderId={parseInt(params.id, 10)} />;
}
