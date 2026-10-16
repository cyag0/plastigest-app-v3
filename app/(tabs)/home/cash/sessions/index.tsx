import { formatDateTime, formatTime } from "@/utils/dates";
import AppList from "@/components/App/AppList/AppList";
import AppChip from "@/components/App/Chip";
import { useAuth } from "@/contexts/AuthContext";
import { useCan } from "@/hooks/useCan";
import { formatMoney } from "@/utils/format";
import { shortLocationName } from "@/utils/locations";
import { createCrudService } from "@/utils/services/crudService";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

type Session = App.Entities.CashRegisterSession;

const service = createCrudService<Session>("/auth/admin/cash-register-sessions");

/**
 * Cómo quedó el corte, dicho en palabras: "Cuadra", "Faltan $50.00",
 * "Sobran $20.00". Antes era solo el número ("-$50.00"), con el Chip de
 * Paper que en Android cortaba el texto a la mitad.
 */
function DifferenceChip({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  if (Math.abs(value) < 0.005) {
    return (
      <AppChip size="sm" variant="success" icon="check">
        Cuadra
      </AppChip>
    );
  }
  return value < 0 ? (
    <AppChip size="sm" variant="error">{`Faltan ${formatMoney(Math.abs(value))}`}</AppChip>
  ) : (
    <AppChip size="sm" variant="info">{`Sobran ${formatMoney(value)}`}</AppChip>
  );
}

function StatusChip({ status }: { status: Session["status"] }) {
  return status === "open" ? (
    <AppChip size="sm" variant="warning" icon="clock-outline">
      Abierto
    </AppChip>
  ) : (
    <AppChip size="sm" variant="default">
      Cerrado
    </AppChip>
  );
}

/** "15 oct 2026, 6:35 a.m. – 6:55 a.m." (la fecha del cierre solo si es otro día). */
function shiftTime(item: Session): string {
  const opened = formatDateTime(item.opened_at);
  if (!item.closed_at) return opened;
  const sameDay = new Date(item.opened_at).toDateString() === new Date(item.closed_at).toDateString();
  return `${opened} – ${sameDay ? formatTime(item.closed_at) : formatDateTime(item.closed_at)}`;
}

/** Historial de turnos de caja (reemplaza al cierre diario). */
export default function CashSessionsIndex() {
  const { selectedCompany, user } = useAuth();
  const { can, canAccessRoute } = useCan();
  const detailRoute = (item: Session) => `/(tabs)/home/cash/sessions/${item.id}`;
  // El backend deja ver el turno propio sin permiso; el de otro cajero pide
  // cash_register_sessions_read. Además, la pantalla de detalle tiene su regla.
  const canOpen = (item: Session) =>
    (item.user_id === user?.id || can("cash_register_sessions_read")) && canAccessRoute(detailRoute(item));
  const show = (item: Session) => {
    if (canOpen(item)) router.push(detailRoute(item) as any);
  };

  return (
    <AppList<Session>
      title="Turnos de caja"
      service={service}
      showFab={false}
      onItemPress={show}
      filters={[
        {
          type: "simple",
          name: "status",
          label: "Estado",
          options: [
            { label: "Todos", value: "" },
            { label: "Abiertos", value: "open" },
            { label: "Cerrados", value: "closed" },
          ],
        },
      ]}
      menu={{ onShow: show, showView: canOpen, showEdit: false, showDelete: false }}
      columns={[
        { key: "opened_at", title: "Apertura", width: 140, render: (_, item) => formatDateTime(item.opened_at) },
        { key: "cash_register_name", title: "Caja", width: 110, render: (_, item) => item.cash_register_name ?? "—" },
        { key: "user_name", title: "Cajero", width: 140, render: (_, item) => item.user_name ?? "—" },
        { key: "location_name", title: "Sucursal", width: 140, render: (_, item) => item.location_name ?? "—" },
        { key: "status", title: "Estado", width: 100, render: (_, item) => <StatusChip status={item.status} /> },
        { key: "expected_cash", title: "Esperado", width: 110, render: (_, item) => (item.expected_cash == null ? "—" : formatMoney(item.expected_cash)) },
        {
          key: "difference",
          title: "Diferencia",
          width: 130,
          render: (_, item) => (item.difference == null ? "—" : <DifferenceChip value={item.difference} />),
        },
      ]}
      renderCard={({ item }) => ({
        title: `${item.cash_register_name ?? "Caja"} · ${item.user_name ?? "—"}`,
        description: shiftTime(item),
        right: (
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <StatusChip status={item.status} />
            <DifferenceChip value={item.status === "closed" ? item.difference : null} />
          </View>
        ),
        bottom: item.location_name
          ? [{ label: "", value: shortLocationName(item.location_name, selectedCompany?.name) }]
          : [],
      })}
      emptyMessage="Aún no hay turnos de caja."
    />
  );
}
