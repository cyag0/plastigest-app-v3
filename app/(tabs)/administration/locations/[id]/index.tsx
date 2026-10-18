/**
 * Detalle de una sucursal, como el de una compra: arriba el nombre, si está
 * activa y Editar; abajo la dirección y el contacto (lo que sale en los
 * tickets). Eliminar va en el menú ⋮.
 *
 * Antes eran tarjetas con sombra: un círculo gigante con la inicial, la
 * compañía (siempre la actual), «Información del Sistema» con el ID y dos
 * botones a todo lo ancho.
 */

import IconLabel from "@/components/App/IconLabel";
import { ListGroup, ListRow, ListSection } from "@/components/App/ListGroup";
import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import RowMenu, { type RowMenuAction } from "@/components/App/RowMenu";
import StatusBadge from "@/components/App/StatusBadge";
import { SkeletonBlock, SkeletonSection } from "@/components/App/SummaryLayout";
import { FORM_MAX_WIDTH } from "@/components/Form/FormLayout";
import { activeStatus } from "@/constants/statuses";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatDate } from "@/utils/dates";
import { notifyError } from "@/utils/errorNotice";
import { goBack } from "@/utils/navigation";
import { formatPhone } from "@/utils/phone";
import Services from "@/utils/services";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";

type LocationDetail = App.Entities.Location;

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { can } = useCan();
  const { location: current } = useAuth();
  const { isMobile } = useResponsive();
  const styles = useThemedStyles(makeStyles);
  // Sin el permiso el backend responde 403: las acciones no se ofrecen.
  const canEdit = can("locations_update");
  const canDelete = can("locations_delete");

  const [location, setLocation] = useState<LocationDetail | null>(null);
  // 404 (otra sucursal u otra empresa), sin permiso o falla de red: se explica
  // aquí en lugar del detalle.
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const loaded = useRef(false);
  const { submitting: deleting, run } = useSubmitGuard();

  const load = useCallback(async () => {
    try {
      // silent: la falla se explica en la pantalla.
      const response = await Services.admin.locations.show(id, undefined, { silent: true });
      setLocation(response.data.data);
      setProblem(null);
      loaded.current = true;
    } catch (error) {
      // Al volver a una que ya se veía (p. ej. de editar), se queda como estaba.
      if (!loaded.current) setProblem(recordLoadProblem(error, "No se pudo cargar la sucursal."));
    }
  }, [id]);

  // Se recarga al volver de editar.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = () =>
    run(async () => {
      if (!location) return;
      const ok = await alerts.confirm(
        "Se elimina y no se puede deshacer. Si ya tiene ventas, compras o inventario no se puede eliminar: desactívala desde Editar.",
        { title: `¿Eliminar ${location.name}?`, okText: "Eliminar", cancelText: "Volver" },
      );
      if (!ok) return;
      try {
        await Services.admin.locations.destroy(location.id);
        alerts.success("Sucursal eliminada");
        goBack("/(tabs)/administration/locations");
      } catch (error) {
        // El backend explica por qué no (p. ej. ya tiene movimientos).
        notifyError(error, "No se pudo eliminar la sucursal.");
      }
    });

  const menu: RowMenuAction[] =
    location && canDelete
      ? [{ label: "Eliminar sucursal", icon: "delete-outline", onPress: remove, destructive: true }]
      : [];

  // El layout la llama por el nombre de la ruta; el menú depende de la
  // sucursal cargada (sus acciones leen la de este render).
  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Sucursal",
      headerRight: () => (menu.length ? <RowMenu actions={menu} /> : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, location, canDelete]);

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle="No se encontró la sucursal"
        errorTitle="No se pudo cargar la sucursal"
        onRetry={load}
      />
    );
  }

  if (!location) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, !isMobile && styles.contentWide]}>
          <View style={styles.skeletonHeader}>
            <SkeletonBlock width={260} height={26} radius={8} />
            <SkeletonBlock width={180} height={13} />
            <SkeletonBlock width={70} height={22} radius={11} />
          </View>
          <SkeletonSection rows={2} />
        </ScrollView>
      </View>
    );
  }

  const active = location.is_active !== false;
  const isCurrent = current?.id === location.id;
  const created = location.created_at ? formatDate(location.created_at) : null;
  const updated = location.updated_at ? formatDate(location.updated_at) : null;
  const meta = [
    created && `Alta: ${created}`,
    updated && updated !== created && `Último cambio: ${updated}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, !isMobile && styles.contentWide]}>
        <View style={[styles.header, !isMobile && styles.headerWide]}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header" selectable>
              {location.name}
            </Text>
            {!!location.description && <Text style={styles.subtitle}>{location.description}</Text>}
            <View style={styles.statusRow}>
              {/* En un View cada uno se centra con el otro (sueltos se alinean arriba). */}
              <View>
                <StatusBadge {...activeStatus(active, true)} />
              </View>
              {isCurrent && (
                <View>
                  <IconLabel icon="map-marker-outline" label="Estás en esta sucursal" />
                </View>
              )}
            </View>
            {!active && <Text style={styles.hint}>No aparece al elegir sucursal.</Text>}
          </View>

          {canEdit && (
            <View style={isMobile ? styles.headerActionPhone : undefined}>
              <Button
                mode="contained"
                icon="pencil-outline"
                onPress={() => router.push(`/(tabs)/administration/locations/${location.id}/edit` as any)}
                disabled={deleting}
              >
                Editar
              </Button>
            </View>
          )}
        </View>

        <ListSection title="Ubicación y contacto">
          <ListGroup>
            <ListRow
              icon="map-marker-outline"
              title={location.address || "Sin dirección"}
              chevron={false}
              alignTop
            />
            {!!location.phone && (
              <ListRow icon="phone-outline" title={formatPhone(location.phone)} chevron={false} />
            )}
            {!!location.email && (
              <ListRow icon="email-outline" title={location.email} chevron={false} />
            )}
          </ListGroup>
          <Text style={styles.hint}>
            {location.phone
              ? "La dirección y el teléfono salen en los tickets."
              : "La dirección sale en los tickets; el teléfono también, si lo agregas."}
          </Text>
        </ListSection>

        {!!meta && <Text style={styles.meta}>{meta}</Text>}
      </ScrollView>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 40, gap: 22 },
  contentWide: { padding: 28, maxWidth: FORM_MAX_WIDTH + 56, width: "100%", alignSelf: "center" },

  // Encabezado sin tarjeta, como el de una compra: el estado va en el badge
  // y Editar a la derecha en pantallas anchas, debajo en el teléfono.
  header: { gap: 14 },
  headerWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: 24,
    rowGap: 14,
  },
  headerText: { gap: 4, flexShrink: 1, minWidth: 0 },
  headerActionPhone: { alignSelf: "stretch" },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: c.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 12,
    rowGap: 6,
    marginTop: 6,
  },
  hint: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  meta: { fontSize: 12, lineHeight: 16, color: c.textMuted },
  skeletonHeader: { gap: 8 },
}));
