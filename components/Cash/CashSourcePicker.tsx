/**
 * ¿De qué caja sale el efectivo? Para un gasto, una compra o un movimiento de
 * caja que se paga (o entra) con el dinero del cajón.
 *
 *   Con turno propio      «Sale de tu turno en Caja 1.»
 *   Sin turno propio      se elige uno de los turnos abiertos de la sucursal
 *                         («Caja 1 · turno de Juan»); con uno solo, ya va
 *                         elegido. El movimiento entra al corte de ese turno
 *                         con el nombre de quien lo registró.
 *   Nadie tiene turno     se avisa: el servidor lo rechaza (no_open_session).
 *
 * Antes el efectivo se cargaba al turno de quien lo registraba y, si no tenía,
 * a ningún corte: el encargado sacaba dinero del cajón del cajero y el cajero
 * cerraba con faltante.
 *
 * La pantalla tiene el estado (useOpenCashSessions) para validar antes de
 * guardar con `problem(value)`; este componente solo lo pinta.
 */

import { ListGroup, ListRow } from "@/components/App/ListGroup";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import { SALE_ERROR_CODES } from "@/components/Pos/saleErrors";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { formatTime } from "@/utils/dates";
import Services from "@/utils/services";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

/**
 * Errores del servidor tras los que hay que volver a pedir los turnos
 * abiertos: el elegido o el propio se cerró, o ya no hay ninguno.
 */
export const CASH_SOURCE_CODES: string[] = [
  SALE_ERROR_CODES.cashSessionRequired,
  SALE_ERROR_CODES.cashSessionClosed,
  SALE_ERROR_CODES.noOpenSession,
];

/** El turno donde ya quedó el movimiento (al editar un gasto). */
export interface CurrentCashSession {
  id: number;
  status: "open" | "closed";
  cash_register_name?: string | null;
  user_name?: string | null;
}

export interface OpenCashSessionsState {
  sessions: App.Entities.OpenCashSession[];
  /** El turno abierto de quien registra, si tiene. */
  mine: App.Entities.OpenCashSession | null;
  loading: boolean;
  failed: boolean;
  reload: () => void;
  /** Lo que falta para guardar, o null. */
  problem: (value: number | null) => string | null;
}

/** Turnos abiertos de la sucursal; solo se piden cuando sale efectivo de la caja. */
export function useOpenCashSessions(active: boolean, current?: CurrentCashSession | null): OpenCashSessionsState {
  // Cada «Reintentar» (o error del servidor por un turno cerrado) es un
  // intento nuevo; el resultado dice de qué intento es.
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    attempt: number;
    sessions: App.Entities.OpenCashSession[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    Services.cashRegisterSessions
      .openAtLocation()
      .then((sessions) => {
        if (!cancelled) setResult({ attempt, sessions, failed: false });
      })
      .catch(() => {
        if (!cancelled) setResult((prev) => ({ attempt, sessions: prev?.sessions ?? [], failed: true }));
      });
    return () => {
      cancelled = true;
    };
  }, [active, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const sessions = result?.sessions ?? [];
  const loaded = !!result && !result.failed;
  const failed = !!result?.failed && result.attempt === attempt;
  const loading = active && result?.attempt !== attempt;

  const mine = sessions.find((session) => session.mine) ?? null;
  // Al editar, el movimiento se queda en su turno mientras siga abierto.
  const keepsCurrent = current?.status === "open";

  const problem = (value: number | null): string | null => {
    if (!active || keepsCurrent || mine) return null;
    if (loading || !loaded) return failed ? "No se pudieron cargar los turnos abiertos." : null;
    if (sessions.length === 0) return "Nadie tiene turno abierto en esta sucursal.";
    return value ? null : "Elige la caja del efectivo.";
  };

  return { sessions, mine, loading, failed, reload, problem };
}

/** «Caja 1 · turno de Juan» */
export function cashSessionLabel(session: {
  cash_register_name?: string | null;
  user_name?: string | null;
}): string {
  const register = session.cash_register_name || "Caja";
  return session.user_name ? `${register} · turno de ${session.user_name}` : register;
}

interface Props {
  state: OpenCashSessionsState;
  /** Sale (o entra) efectivo de la caja: si no, no se pinta nada. */
  active: boolean;
  value: number | null;
  onChange: (sessionId: number | null) => void;
  /** Al editar: el turno donde ya está el movimiento. */
  current?: CurrentCashSession | null;
  /** Entra dinero (ingreso) en lugar de salir. */
  incoming?: boolean;
  /** Qué hacer si nadie tiene turno abierto, además de abrir uno. */
  emptyHint?: string;
  /** Se intentó guardar: se marca lo que falta. */
  showError?: boolean;
  readonly?: boolean;
}

export default function CashSourcePicker({
  state,
  active,
  value,
  onChange,
  current,
  incoming,
  emptyHint,
  showError,
  readonly,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { sessions, mine, loading, failed } = state;
  const others = sessions.filter((session) => !session.mine);

  // Con un solo turno abierto ya va elegido; si el elegido se cerró, se quita.
  useEffect(() => {
    if (!active || mine || current?.status === "open" || readonly) return;
    if (value && !others.some((session) => session.id === value)) {
      onChange(null);
    } else if (!value && others.length === 1) {
      onChange(others[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sessions, mine, current?.status, readonly]);

  if (!active) return null;

  // Ya está en un turno abierto (al editar): ahí se queda.
  if (current?.status === "open") {
    return (
      <Text style={styles.hint}>
        {`${incoming ? "Entró a" : "Salió de"} ${cashSessionLabel(current)}: se queda en ese corte.`}
      </Text>
    );
  }

  if (readonly) return null;

  if (loading && sessions.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.textMuted} />
        <Text style={styles.hint}>Buscando los turnos abiertos…</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <Pressable onPress={state.reload} accessibilityRole="button" hitSlop={6}>
        <Text style={styles.error}>
          No se pudieron cargar los turnos abiertos. <Text style={styles.link}>Reintentar</Text>
        </Text>
      </Pressable>
    );
  }

  if (mine) {
    return (
      <Text style={styles.hint}>
        {incoming
          ? `Entra a tu turno en ${mine.cash_register_name || "tu caja"}: se suma en tu corte.`
          : `Sale de tu turno en ${mine.cash_register_name || "tu caja"}: se descuenta en tu corte.`}
      </Text>
    );
  }

  if (others.length === 0) {
    return (
      <Text style={[styles.hint, styles.warning]}>
        {`Nadie tiene turno abierto en esta sucursal, así que el efectivo no puede ${incoming ? "entrar a" : "salir de"} una caja. Pide que alguien abra su turno${emptyHint ? `, o ${emptyHint}` : ""}.`}
      </Text>
    );
  }

  const missing = showError && !value;

  return (
    <View style={styles.field}>
      <InputLabel label={incoming ? "¿A qué caja entra?" : "¿De qué caja sale?"} />
      <ListGroup>
        {others.map((session) => {
          const selected = session.id === value;
          return (
            <ListRow
              key={session.id}
              icon={selected ? "radiobox-marked" : "radiobox-blank"}
              iconColor={selected ? colors.primary : colors.textMuted}
              title={session.cash_register_name || "Caja"}
              subtitle={`Turno de ${session.user_name || "—"} · desde las ${formatTime(session.opened_at)}`}
              chevron={false}
              onPress={() => onChange(session.id)}
              accessibilityLabel={`${cashSessionLabel(session)}${selected ? ", elegida" : ""}`}
            />
          );
        })}
      </ListGroup>
      <Text style={missing ? styles.error : styles.hint}>
        {missing
          ? incoming
            ? "Elige a qué caja entra el efectivo."
            : "Elige de qué caja sale el efectivo."
          : incoming
            ? "No tienes turno abierto: se suma al corte de esa caja, con tu nombre."
            : "No tienes turno abierto: se descuenta del corte de esa caja, con tu nombre."}
      </Text>
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  field: { gap: 8 },
  loading: { flexDirection: "row", alignItems: "center", gap: 8 },
  hint: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
  warning: { color: c.warningStrong },
  error: { color: c.error, fontSize: 13, lineHeight: 18 },
  link: { color: c.primary, fontWeight: "600" },
}));
