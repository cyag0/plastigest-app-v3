import ActiveBadge from "@/components/App/ActiveBadge";
import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import { activeFilter } from "@/constants/listFilters";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { formatPhone } from "@/utils/phone";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

export default function SuppliersIndex() {
  const router = useRouter();

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
      render: (_, item) => <ActiveBadge active={!!item.is_active} />,
    },
  ];

  return (
    <>
      <AppList
        title="Proveedores"
        service={Services.suppliers}
        permissionPrefix="suppliers"
        columns={columns}
        filters={[activeFilter()]}
        renderCard={({ item }: { item: any }) => {
          console.log("Rendering supplier item:", item);

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
                        color: palette.primary,
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
          // El detalle vive en administration/suppliers/[id] (la ruta
          // home/suppliers/:id no existe y abría "no encontrado").
          router.push(`/(tabs)/administration/suppliers/${entity.id}` as any);
        }}
        onPressCreate={() => {
          router.push("/(tabs)/administration/suppliers/form" as any);
        }}
        fabLabel="Nuevo Proveedor"
      />
    </>
  );
}
