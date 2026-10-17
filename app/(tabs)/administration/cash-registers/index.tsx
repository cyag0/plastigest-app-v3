import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import StatusBadge, { type StatusBadgeProps } from "@/components/App/StatusBadge";
import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import Services from "@/utils/services";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar } from "react-native-paper";

/**
 * Estado de la caja: libre, con turno abierto de alguien, o desactivada.
 * Corto en la tarjeta (en celular el chip sólido con el nombre del cajero
 * dejaba al nombre de la caja una letra por renglón); en la tabla, con quién.
 */
function registerStatus(item: App.Entities.CashRegister, withCashier: boolean): StatusBadgeProps {
  if (!item.is_active) return { label: "Inactiva", tone: "neutral" };
  if (item.open_session) {
    return {
      label: withCashier ? `Turno: ${item.open_session.user_name ?? "abierto"}` : "En turno",
      tone: "info",
      icon: "account-clock",
    };
  }
  return { label: "Libre", tone: "success" };
}

function RegisterStatus({ item, withCashier = false }: { item: App.Entities.CashRegister; withCashier?: boolean }) {
  return <StatusBadge {...registerStatus(item, withCashier)} />;
}

const BASE = "/(tabs)/administration/cash-registers";

export default function CashRegistersIndexScreen() {
  // ?scope=location: solo las cajas de la sucursal actual (Administración ›
  // Esta sucursal); las nuevas se crean en ella.
  const { scope } = useLocalSearchParams<{ scope?: string }>();
  const branchScope = scope === "location";
  const suffix = branchScope ? "?scope=location" : "";
  const { location } = useAuth();

  const columns: AppListColumn<App.Entities.CashRegister>[] = [
    { title: "Código", dataIndex: "code", key: "code", width: 110 },
    { title: "Nombre", dataIndex: "name", key: "name", width: 180 },
    ...(branchScope
      ? []
      : [{ title: "Sucursal", dataIndex: "location_name", key: "location_name", width: 200 } as AppListColumn<App.Entities.CashRegister>]),
    {
      title: "Estado",
      key: "status",
      width: 180,
      align: "center",
      render: (_, item) => <RegisterStatus item={item} withCashier />,
    },
  ];

  return (
    <AppList<App.Entities.CashRegister>
      title="Cajas"
      service={Services.cashRegisters}
      // Sin el permiso el backend responde 403: «+», «Editar», «Eliminar» y
      // abrir el detalle no se ofrecen (cash_registers_create/update/delete/read).
      permissionPrefix="cash_registers"
      defaultFilters={branchScope ? { current_location: 1 } : undefined}
      columns={columns}
      renderCard={({ item }) => ({
        title: item.name,
        description: branchScope ? item.code : `${item.code} · ${item.location_name ?? ""}`,
        left: <Avatar.Icon size={40} icon="cash-register" style={styles.avatar} />,
        right: <RegisterStatus item={item} />,
        bottom: item.open_session
          ? [{ label: "Turno de", value: item.open_session.user_name ?? "alguien" }]
          : [],
      })}
      menu={{
        onCreate: () => router.push(`${BASE}/form${suffix}` as any),
        onShow: (item) => router.push(`${BASE}/${item.id}${suffix}` as any),
        onEdit: (item) => router.push(`${BASE}/${item.id}/edit${suffix}` as any),
      }}
      searchPlaceholder="Buscar por nombre o código..."
      emptyMessage={
        branchScope
          ? `Aún no hay cajas en ${location?.name ?? "esta sucursal"}. Crea una por cada punto de cobro.`
          : "Aún no hay cajas. Crea una por cada punto de cobro."
      }
    />
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: palette.primary },
});
