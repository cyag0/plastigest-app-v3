import AppList from "@/components/App/AppList/AppList";
import palette from "@/constants/palette";
import { formatMoney } from "@/hooks/usePosCart";
import { createCrudService } from "@/utils/services/crudService";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Chip, Text } from "react-native-paper";

type Session = App.Entities.CashRegisterSession;

const service = createCrudService<Session>("/auth/admin/cash-register-sessions");

const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }) : "—";

function DifferenceChip({ value }: { value: number | null | undefined }) {
  if (value == null) return <Text style={{ color: palette.textSecondary }}>—</Text>;
  const color = value === 0 ? palette.success : value > 0 ? palette.blue : palette.error;
  return (
    <Chip compact style={{ backgroundColor: `${color}20`, height: 24 }} textStyle={{ fontSize: 11, color }}>
      {value > 0 ? "+" : value < 0 ? "-" : ""}
      {formatMoney(Math.abs(value))}
    </Chip>
  );
}

function StatusChip({ status }: { status: Session["status"] }) {
  const open = status === "open";
  const color = open ? palette.warning : palette.textSecondary;
  return (
    <Chip compact style={{ backgroundColor: `${color}20`, height: 24 }} textStyle={{ fontSize: 11, color }}>
      {open ? "Abierto" : "Cerrado"}
    </Chip>
  );
}

/** Historial de turnos de caja (reemplaza al cierre diario). */
export default function CashSessionsIndex() {
  const show = (item: Session) => router.push(`/(tabs)/home/cash/sessions/${item.id}` as any);

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
      menu={{ onShow: show, showView: true, showEdit: false, showDelete: false }}
      columns={[
        { key: "opened_at", title: "Apertura", width: 140, render: (_, item) => formatDateTime(item.opened_at) },
        { key: "cash_register_name", title: "Caja", width: 110, render: (_, item) => item.cash_register_name ?? "—" },
        { key: "user_name", title: "Cajero", width: 140, render: (_, item) => item.user_name ?? "—" },
        { key: "location_name", title: "Sucursal", width: 140, render: (_, item) => item.location_name ?? "—" },
        { key: "status", title: "Estado", width: 100, render: (_, item) => <StatusChip status={item.status} /> },
        { key: "expected_cash", title: "Esperado", width: 110, render: (_, item) => (item.expected_cash == null ? "—" : formatMoney(item.expected_cash)) },
        { key: "difference", title: "Diferencia", width: 120, render: (_, item) => <DifferenceChip value={item.difference} /> },
      ]}
      renderCard={({ item }) => ({
        title: `${item.cash_register_name ?? "Caja"} · ${item.user_name ?? ""}`,
        subtitle: formatDateTime(item.opened_at),
        description: item.location_name ?? undefined,
        right: (
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <StatusChip status={item.status} />
            <DifferenceChip value={item.difference} />
          </View>
        ),
      })}
    />
  );
}
