import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { useTheme } from "@/contexts/ThemeContext";
import Services from "@/utils/services";
import { formatPhone } from "@/utils/phone";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function ClientsIndex() {
  const router = useRouter();
  const { colors } = useTheme();

  const columns: AppListColumn<any>[] = [
    { title: "Nombre", dataIndex: "name", key: "name", width: 200 },
    {
      title: "Razón Social",
      key: "business_name",
      width: 220,
      render: (_, item) => item.business_name || item.social_reason || "—",
    },
    { title: "RFC", dataIndex: "rfc", key: "rfc", width: 140 },
    { title: "Email", dataIndex: "email", key: "email", width: 200 },
    { title: "Teléfono", dataIndex: "phone", key: "phone", width: 140, render: (value) => formatPhone(value) },
    {
      title: "Estado",
      key: "is_active",
      width: 100,
      align: "center",
      render: (_, item) => (
        <ActiveBadge active={!!item.is_active} />
      ),
    },
  ];

  return (
    <>
      <AppList
        title="Clientes"
        service={Services.customers}
        permissionPrefix="customers"
        columns={columns}
        filters={[
          {
            type: "simple",
            name: "is_active",
            label: "Estado",
            options: [
              { label: "Todos", value: "" },
              { label: "Activos", value: "1" },
              { label: "Inactivos", value: "0" },
            ],
          },
        ]}
        renderCard={({ item }: { item: any }) => {
          console.log("Rendering client item:", item);

          return {
            title: (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <AppList.Title>{item.name}</AppList.Title>
                <ActiveBadge active={!!item.is_active} />
              </View>
            ),
            description: (
              <>
                <AppList.Description numberOfLines={2}>
                  {item.business_name ||
                    item.social_reason ||
                    "Sin razón social"}
                </AppList.Description>
                {item.rfc && (
                  <View style={{ marginTop: 4 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: colors.primary,
                      }}
                    >
                      RFC: {item.rfc}
                    </Text>
                  </View>
                )}
              </>
            ),
            // Teléfono y correo en la línea de datos (antes iban en
            // subtitle/bottomContent, que la lista no dibuja).
            bottom: [
              ...(item.phone ? [{ label: "Tel", value: formatPhone(item.phone) }] : []),
              ...(item.email ? [{ label: "", value: item.email }] : []),
            ],
          };
        }}
        onItemPress={(entity: any) => {
          router.push(`/(tabs)/administration/clientes/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/administration/clientes/form" as any);
        }}
        menu={{
          onEdit(item) {
            router.push(
              `/(tabs)/administration/clientes/${item.id}/edit` as any
            );
          },
        }}
      />
    </>
  );
}
