/**
 * Procesos de producción: qué entra y qué sale de cada uno (Abrir cocos:
 * coco → agua y pulpa). Son la plantilla del registro diario y la base del
 * rendimiento esperado.
 */

import AppBar from "@/components/App/AppBar";
import EmptyState from "@/components/App/EmptyState";
import { ListGroup, ListGroupSkeleton, ListRow } from "@/components/App/ListGroup";
import RowMenu from "@/components/App/RowMenu";
import { shortName } from "@/components/Production/productionFormat";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

export default function ProcessesIndex() {
  const router = useRouter();
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { colors } = useTheme();
  const { can } = useCan();
  const canCreate = can("formulas_create");
  const canUpdate = can("formulas_update");

  const [processes, setProcesses] = useState<App.Entities.Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r: any = await Services.formulas.index({ sort_by: "name", sort_direction: "asc" });
      const rows = r?.data?.data ?? r?.data ?? [];
      setProcesses(Array.isArray(rows) ? rows : []);
    } catch {
      // Aviso global.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({
        headerRight: () =>
          canCreate ? (
            <AppBar.Action icon="plus" iconColor={colors.primary} onPress={() => router.push("/(tabs)/home/production/formulas/form" as any)} />
          ) : null,
      });
    }, [navigation, canCreate, colors.primary, router]),
  );

  const toggleActive = async (formula: App.Entities.Formula) => {
    try {
      await Services.formulas.update(formula.id, { is_active: !formula.is_active } as any);
      alerts.success(formula.is_active ? "Proceso desactivado: ya no aparece al registrar" : "Proceso activado");
      load();
    } catch {
      // Aviso global.
    }
  };

  const duplicate = async (formula: App.Entities.Formula) => {
    try {
      const r: any = await Services.formulas.clone(formula.id, `${formula.name} (copia)`);
      const copy = r?.data ?? r;
      alerts.success("Proceso duplicado");
      if (copy?.id) router.push(`/(tabs)/home/production/formulas/form?id=${copy.id}` as any);
      else load();
    } catch {
      // Aviso global.
    }
  };

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40, gap: 14, maxWidth: 760, width: "100%", alignSelf: "center" },
    intro: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  }));

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.intro}>
          Cada proceso dice qué entra y qué sale. Lo que sale a granel se envasa en sus presentaciones (botellas, bolsas), que se configuran en cada producto.
        </Text>

        {loading ? (
          <ListGroupSkeleton rows={4} />
        ) : processes.length === 0 ? (
          <EmptyState
            icon="pot-steam-outline"
            title="Todavía no hay procesos"
            description="Por ejemplo, «Abrir cocos»: entra coco entero y sale agua y pulpa."
            actionLabel={canCreate ? "Crear proceso" : undefined}
            onAction={canCreate ? () => router.push("/(tabs)/home/production/formulas/form" as any) : undefined}
          />
        ) : (
          <ListGroup>
            {processes.map((f) => {
              const outputs = f.outputs ?? [];
              const presentations = outputs.reduce((n, o) => n + (o.presentations?.length ?? 0), 0);
              return (
                <ListRow
                  key={f.id}
                  icon="pot-steam-outline"
                  iconColor={f.is_active ? colors.primary : colors.textMuted}
                  title={f.name}
                  subtitle={`${(f.items ?? []).map((i) => shortName(i.product_name)).slice(0, 2).join(", ")} → ${outputs
                    .slice(0, 3)
                    .map((o) => shortName(o.product_name))
                    .join(", ")}${outputs.length > 3 ? ` y ${outputs.length - 3} más` : ""}`}
                  subtitleLines={2}
                  meta={[
                    f.is_active ? null : "Inactivo",
                    presentations ? `${presentations} ${presentations === 1 ? "presentación" : "presentaciones"}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined}
                  alignTop
                  onPress={() => router.push(`/(tabs)/home/production/formulas/form?id=${f.id}` as any)}
                  trailing={
                    canUpdate || canCreate ? (
                      <RowMenu
                        actions={[
                          ...(canCreate ? [{ label: "Duplicar", icon: "content-copy" as const, onPress: () => duplicate(f) }] : []),
                          ...(canUpdate
                            ? [
                                {
                                  label: f.is_active ? "Desactivar" : "Activar",
                                  icon: (f.is_active ? "eye-off-outline" : "eye-outline") as any,
                                  onPress: () => toggleActive(f),
                                },
                              ]
                            : []),
                        ]}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </ListGroup>
        )}
      </ScrollView>
    </View>
  );
}
