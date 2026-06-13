import { useAlerts } from "@/hooks/useAlerts";
import Services from "@/utils/services";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Text } from "react-native-paper";
import palette from "@/constants/palette";
import ProductionForm from "../form";

export default function EditProduction() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const alerts = useAlerts();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await Services.productionOrders.show(parseInt(params.id, 10));
        const order = r?.data?.data ?? r?.data;
        if (order.status !== "draft") {
          alerts.warning("Solo se pueden editar producciones en estado Borrador");
          router.replace(`/(tabs)/home/production/${params.id}` as any);
          return;
        }
        setAllowed(true);
      } catch (e: any) {
        alerts.error("No se pudo cargar: " + e.message);
        router.back();
      }
    })();
  }, [params.id, alerts, router]);

  if (allowed !== true) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", maxWidth: 600, width: "100%", alignSelf: "center" }}>
        <ActivityIndicator color={palette.primary} />
        <Text style={{ marginTop: 8, color: palette.textSecondary }}>
          Verificando producción…
        </Text>
      </View>
    );
  }

  return <ProductionForm />;
}
