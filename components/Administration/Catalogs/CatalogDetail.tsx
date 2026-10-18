/**
 * Detalle de un registro de catálogo (categoría, cliente, proveedor, unidad,
 * caja), como el de una compra o una sucursal: arriba el nombre, su estado y
 * Editar; abajo sus datos en grupos. Eliminar va en el menú ⋮.
 *
 * Antes el detalle era el formulario en solo lectura: etiquetas en gris con
 * su valor, uno debajo de otro, con «Empresa» (siempre la actual) y
 * «Cliente Activo: Sí». Además, al volver de editar seguía mostrando los
 * datos de antes; aquí se recarga cada vez que se vuelve a la pantalla.
 */

import RecordLoadError, {
  recordLoadProblem,
  type RecordLoadProblem,
} from "@/components/App/RecordLoadError";
import RowMenu, { type RowMenuAction } from "@/components/App/RowMenu";
import { SkeletonBlock, SkeletonSection } from "@/components/App/SummaryLayout";
import { FORM_MAX_WIDTH } from "@/components/Form/FormLayout";
import { useAlerts } from "@/hooks/useAlerts";
import { useCan } from "@/hooks/useCan";
import { useResponsive } from "@/hooks/useResponsive";
import { useSubmitGuard } from "@/hooks/useSubmitGuard";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { notifyError } from "@/utils/errorNotice";
import type { CrudService } from "@/utils/services/crudService";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { useLeaveScreen } from "./useLeaveScreen";

export interface CatalogDetailHeader {
  title: string;
  /** Una línea debajo del nombre (nombre comercial, código y sucursal…). */
  subtitle?: string | null;
  /** Estado y atributos: StatusBadge, IconLabel. */
  badges?: React.ReactNode[];
  /** Qué significa el estado, en una línea ("No se puede abrir turno en ella."). */
  hint?: string | null;
}

export interface CatalogDetailProps<T extends { id: number }> {
  id: number;
  service: CrudService<T>;
  /** Editar pide <prefix>_update y Eliminar <prefix>_delete. */
  permissionPrefix: string;
  /** Una condición más para Editar y Eliminar (p. ej. unidades del sistema). */
  canChange?: (record: T) => boolean;
  editHref: (record: T) => string;
  /** A dónde ir después de eliminar si se llegó por enlace o recargando. */
  listHref: string;
  texts: {
    notFound: string;
    loadError: string;
    /** Opción del menú ⋮: "Eliminar cliente". */
    deleteLabel: string;
    /** Qué pasa al eliminar y cuándo no se puede. */
    deleteMessage: string;
    deleted: string;
  };
  header: (record: T) => CatalogDetailHeader;
  children: (record: T) => React.ReactNode;
}

export default function CatalogDetail<T extends { id: number }>({
  id,
  service,
  permissionPrefix,
  canChange,
  editHref,
  listHref,
  texts,
  header,
  children,
}: CatalogDetailProps<T>) {
  const router = useRouter();
  const navigation = useNavigation();
  const alerts = useAlerts();
  const { can } = useCan();
  const { isMobile } = useResponsive();
  const styles = useThemedStyles(makeStyles);

  const [record, setRecord] = useState<T | null>(null);
  // 404 (borrado o de otra empresa), sin permiso o falla de red: se explica
  // aquí en lugar del detalle.
  const [problem, setProblem] = useState<RecordLoadProblem | null>(null);
  const loaded = useRef(false);
  const { submitting: deleting, run } = useSubmitGuard();
  const leave = useLeaveScreen(listHref);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setProblem({ kind: "not_found", message: "" });
      return;
    }
    try {
      // silent: la falla se explica en la pantalla.
      const response = await service.show(id, undefined, { silent: true });
      setRecord(response.data.data);
      setProblem(null);
      loaded.current = true;
    } catch (error) {
      // Al volver a uno que ya se veía (p. ej. de editar), se queda como estaba.
      if (!loaded.current) setProblem(recordLoadProblem(error, texts.loadError));
    }
  }, [id, service, texts.loadError]);

  // Se recarga al volver de editar.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const allowed = !!record && (canChange ? canChange(record) : true);
  const canEdit = allowed && can(`${permissionPrefix}_update`);
  const canDelete = allowed && can(`${permissionPrefix}_delete`);

  const remove = () =>
    run(async () => {
      if (!record) return;
      const ok = await alerts.confirm(texts.deleteMessage, {
        title: `¿Eliminar ${header(record).title}?`,
        okText: "Eliminar",
        cancelText: "Volver",
      });
      if (!ok) return;
      try {
        await service.destroy(record.id);
        alerts.success(texts.deleted);
        leave();
      } catch (error) {
        // El backend explica por qué no (p. ej. ya tiene ventas o productos).
        notifyError(error, "No se pudo eliminar.");
      }
    });

  const menu: RowMenuAction[] = canDelete
    ? [{ label: texts.deleteLabel, icon: "delete-outline", onPress: remove, destructive: true }]
    : [];

  // El menú ⋮ de la barra depende del registro cargado (su acción lee el de
  // este render).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (menu.length ? <RowMenu actions={menu} /> : null),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, record, canDelete]);

  if (problem) {
    return (
      <RecordLoadError
        problem={problem}
        notFoundTitle={texts.notFound}
        errorTitle={texts.loadError}
        onRetry={load}
      />
    );
  }

  const contentStyle = [styles.content, !isMobile && styles.contentWide];

  if (!record) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={contentStyle}>
          <View style={styles.skeletonHeader}>
            <SkeletonBlock width={240} height={26} radius={8} />
            <SkeletonBlock width={170} height={13} />
            <SkeletonBlock width={70} height={22} radius={11} />
          </View>
          <SkeletonSection rows={2} />
        </ScrollView>
      </View>
    );
  }

  const head = header(record);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={contentStyle}>
        {/* Encabezado sin tarjeta, como el de una compra: el estado va en el
            badge y Editar a la derecha en pantallas anchas, debajo en el
            teléfono. */}
        <View style={[styles.header, !isMobile && styles.headerWide]}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header" selectable>
              {head.title}
            </Text>
            {!!head.subtitle && (
              <Text style={styles.subtitle} selectable>
                {head.subtitle}
              </Text>
            )}
            {!!head.badges?.length && (
              <View style={styles.statusRow}>
                {/* En un View cada uno se centra con el otro (sueltos se alinean arriba). */}
                {head.badges.map((badge, i) => (
                  <View key={i}>{badge}</View>
                ))}
              </View>
            )}
            {!!head.hint && <Text style={styles.hint}>{head.hint}</Text>}
          </View>

          {canEdit && (
            <View style={isMobile ? styles.headerActionPhone : undefined}>
              <Button
                mode="contained"
                icon="pencil-outline"
                onPress={() => router.push(editHref(record) as any)}
                disabled={deleting}
              >
                Editar
              </Button>
            </View>
          )}
        </View>

        {children(record)}
      </ScrollView>
    </View>
  );
}

/** Texto corrido de un detalle (notas, descripción). */
export function DetailText({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={styles.text} selectable>
      {children}
    </Text>
  );
}

/** Una línea de ayuda debajo de un grupo. */
export function DetailHint({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.hint}>{children}</Text>;
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  content: { padding: 16, paddingBottom: 40, gap: 22 },
  contentWide: { padding: 28, maxWidth: FORM_MAX_WIDTH + 56, width: "100%", alignSelf: "center" },

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
  text: { fontSize: 14, lineHeight: 20, color: c.text },
  skeletonHeader: { gap: 8 },
}));
