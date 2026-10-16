import AppList from "@/components/App/AppList/AppList";
import { AppListColumn } from "@/components/App/AppList/AppListDataTable";
import PermissionGate from "@/components/App/PermissionGate";
import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

/**
 * Todos los productos que entrega el proceso.
 *
 * Las fórmulas anteriores al rediseño multi-salida no traen `outputs`; el
 * backend sigue exponiendo la salida principal suelta, y de ahí se toma.
 */
function formatOutputs(formula: any): string {
  const outputs = formula?.outputs ?? [];

  if (outputs.length > 0) {
    return outputs
      .map((o: any) => o.product_name ?? o.product?.name)
      .filter(Boolean)
      .join(" · ");
  }

  return formula?.product_name ?? "—";
}

const FORMULAS_COLUMNS: AppListColumn<any>[] = [
  {
    title: "Nombre",
    dataIndex: "name",
    key: "name",
    width: 280,
  },
  {
    title: "Resultados",
    dataIndex: "outputs",
    key: "outputs",
    width: 260,
    render: (_value: any, record: any) => (
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{ color: palette.text, fontSize: 13 }}
      >
        {formatOutputs(record)}
      </Text>
    ),
  },
  {
    title: "Versión",
    dataIndex: "version",
    key: "version",
    width: 110,
    align: "center",
    render: (value: any) => (
      <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
        v{value ?? 1}
      </Text>
    ),
  },
  {
    title: "Ingredientes",
    dataIndex: "items",
    key: "items",
    width: 130,
    align: "center",
    render: (value: any) => {
      const count = Array.isArray(value) ? value.length : 0;
      return (
        <Text style={{ color: palette.text, fontSize: 13, fontWeight: "600" }}>
          {count}
        </Text>
      );
    },
  },
  {
    title: "Estado",
    dataIndex: "is_active",
    key: "is_active",
    width: 130,
    align: "center",
    render: (value: any) => {
      const isActive = !!value;
      return (
        <View
          style={{
            backgroundColor: isActive ? palette.success + "22" : palette.surface,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            alignSelf: "center",
          }}
        >
          <Text
            style={{
              color: isActive ? palette.success : palette.textSecondary,
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {isActive ? "Activa" : "Inactiva"}
          </Text>
        </View>
      );
    },
  },
  {
    title: "Descripción",
    dataIndex: "description",
    key: "description",
    width: 280,
    render: (value: any) =>
      value ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ color: palette.textSecondary, fontSize: 12 }}
        >
          {String(value)}
        </Text>
      ) : (
        <Text style={{ color: palette.textSecondary, fontSize: 12 }}>—</Text>
      ),
  },
];

export default function FormulasIndex() {
  const router = useRouter();

  return (
    <PermissionGate permission="formulas_list">
      <AppList
        title="Fórmulas"
        service={Services.formulas}
        permissionPrefix="formulas"
        columns={FORMULAS_COLUMNS}
        actionColumnTitle="Acciones"
        actionColumnWidth={140}
        renderCard={({ item }: { item: any }) => ({
          title: item.name,
          description: (
            <View>
              <Text style={{ color: palette.textSecondary, fontSize: 12 }}>
                {formatOutputs(item)}  ·  v{item.version}
              </Text>
              {item.description ? (
                <Text
                  style={{ color: palette.textSecondary, fontSize: 11, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              ) : null}
              {item.items ? (
                <Text
                  style={{ color: palette.text, fontSize: 12, marginTop: 4 }}
                >
                  {item.items.length} {item.items.length === 1 ? "ingrediente" : "ingredientes"}
                  {(item.outputs?.length ?? 0) > 1
                    ? ` · ${item.outputs.length} resultados`
                    : ""}
                </Text>
              ) : null}
            </View>
          ),
          left: (
            <View
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                backgroundColor: palette.accent + "22",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="flask" size={26} color={palette.accent} />
            </View>
          ),
          right: (
            <View
              style={{
                backgroundColor: item.is_active ? palette.success + "22" : palette.surface,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  color: item.is_active ? palette.success : palette.textSecondary,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                {item.is_active ? "Activa" : "Inactiva"}
              </Text>
            </View>
          ),
        })}
        onItemPress={(item: any) =>
          router.push(`/(tabs)/home/production/formulas/form?id=${item.id}` as any)
        }
        menu={{
          onEdit: (item: any) =>
            router.push(`/(tabs)/home/production/formulas/form?id=${item.id}` as any),
        }}
        onPressCreate={() =>
          router.push("/(tabs)/home/production/formulas/form" as any)
        }
        fabLabel="Nueva Fórmula"
      />
    </PermissionGate>
  );
}

const styles = StyleSheet.create({});
