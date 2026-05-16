import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Chip, Text } from "react-native-paper";

export default function ClientsIndex() {
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
    { title: "Teléfono", dataIndex: "phone", key: "phone", width: 140 },
    {
      title: "Estado",
      key: "is_active",
      width: 100,
      align: "center",
      render: (_, item) => (
        <Chip
          style={{ backgroundColor: item.is_active ? palette.success : palette.error }}
          textStyle={{ color: "white" }}
          compact
        >
          {item.is_active ? "Activo" : "Inactivo"}
        </Chip>
      ),
    },
  ];

  return (
    <>
      <AppList
        title="Clientes"
        service={Services.customers}
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
                <Chip
                  mode="flat"
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: item.is_active
                        ? palette.background
                        : palette.error,
                      borderColor: item.is_active
                        ? palette.primary
                        : palette.red,
                    },
                  ]}
                  textStyle={[
                    styles.statusText,
                    {
                      color: item.is_active ? "#2e7d32" : "#c62828",
                    },
                  ]}
                  compact
                >
                  {item.is_active ? "ACTIVO" : "INACTIVO"}
                </Chip>
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
            subtitle: item.email ? `📧 ${item.email}` : undefined,
            bottomContent: (
              <View style={styles.bottomContent}>
                {item.phone && (
                  <Text style={styles.contactText}>📞 {item.phone}</Text>
                )}
                {item.company_name && (
                  <Text style={styles.companyText}>🏢 {item.company_name}</Text>
                )}
              </View>
            ),
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

const styles = StyleSheet.create({
  statusChip: {
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  bottomContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  contactText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
  },
  companyText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    textAlign: "right",
  },
});
