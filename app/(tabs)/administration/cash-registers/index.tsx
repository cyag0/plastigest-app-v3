import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import palette from "@/constants/palette";
import { generateCrudMenu } from "@/utils/routes";
import Services from "@/utils/services";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Avatar, Chip } from "react-native-paper";

/** Estado de la caja: libre, con turno abierto de alguien, o desactivada. */
function StatusChip({ item }: { item: App.Entities.CashRegister }) {
  if (!item.is_active) {
    return (
      <Chip compact style={{ backgroundColor: palette.error }} textStyle={styles.chipText}>
        Inactiva
      </Chip>
    );
  }
  if (item.open_session) {
    return (
      <Chip compact icon="account-clock" style={{ backgroundColor: palette.warning }} textStyle={styles.chipText}>
        {`Turno: ${item.open_session.user_name ?? "abierto"}`}
      </Chip>
    );
  }
  return (
    <Chip compact style={{ backgroundColor: palette.success }} textStyle={styles.chipText}>
      Libre
    </Chip>
  );
}

export default function CashRegistersIndexScreen() {
  const columns: AppListColumn<App.Entities.CashRegister>[] = [
    { title: "Código", dataIndex: "code", key: "code", width: 110 },
    { title: "Nombre", dataIndex: "name", key: "name", width: 180 },
    { title: "Sucursal", dataIndex: "location_name", key: "location_name", width: 200 },
    {
      title: "Estado",
      key: "status",
      width: 180,
      align: "center",
      render: (_, item) => <StatusChip item={item} />,
    },
  ];

  return (
    <AppList<App.Entities.CashRegister>
      title="Cajas"
      service={Services.cashRegisters}
      columns={columns}
      renderCard={({ item }) => ({
        title: item.name,
        description: `${item.code} · ${item.location_name ?? ""}`,
        left: <Avatar.Icon size={46} icon="cash-register" style={styles.avatar} />,
        right: <StatusChip item={item} />,
      })}
      menu={generateCrudMenu("/(tabs)/administration/cash-registers" as any)}
      searchPlaceholder="Buscar por nombre o código..."
      emptyMessage="Aún no hay cajas. Crea una por cada punto de cobro."
    />
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: palette.primary },
  chipText: { color: "white" },
});
