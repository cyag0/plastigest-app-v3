import { FormDatePicker } from "@/components/Form/AppDatePicker";
import { FormProSelect } from "@/components/Form/AppProSelect/AppProSelect";
import palette from "@/constants/palette";
import { useResponsive } from "@/hooks/useResponsive";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext } from "formik";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Text } from "react-native-paper";

const STATUS_OPTIONS = [
  { value: "draft", label: "Borrador" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

interface Props {
  onClear?: () => void;
}

export default function ProductionFilters({ onClear }: Props) {
  const { isMobile } = useResponsive();
  const { values, setFieldValue } = useFormikContext<any>();

  return (
    <Card
      style={[styles.card, { backgroundColor: palette.card, marginHorizontal: 12 }]}
    >
      <Card.Content style={{ paddingVertical: 12 }}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons
            name="filter-variant"
            size={18}
            color={palette.primary}
          />
          <Text
            variant="titleSmall"
            style={{ color: palette.text, fontWeight: "700", marginLeft: 6 }}
          >
            Filtros
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFieldValue("filters", {
                date_from: "",
                date_to: "",
                location_id: null,
                status: null,
                responsible_user_id: null,
                product_id: null,
              });
              onClear?.();
            }}
            style={{ marginLeft: "auto" }}
          >
            <Text style={{ color: palette.primary, fontSize: 12 }}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal={isMobile}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={isMobile ? { gap: 8 } : undefined}
        >
          <View style={isMobile ? { width: 160 } : { flex: 1, marginRight: 8 }}>
            <FormDatePicker
              name="filters.date_from"
              label="Desde"
              placeholder="Fecha inicial"
              hideLabel
            />
          </View>
          <View style={isMobile ? { width: 160 } : { flex: 1, marginRight: 8 }}>
            <FormDatePicker
              name="filters.date_to"
              label="Hasta"
              placeholder="Fecha final"
              hideLabel
            />
          </View>
          <View style={isMobile ? { width: 180 } : { flex: 1, marginRight: 8 }}>
            <FormProSelect
              name="filters.status"
              label="Estado"
              model="__static__"
              options={STATUS_OPTIONS}
              placeholder="Todos"
              hideLabel
            />
          </View>
          <View style={isMobile ? { width: 200 } : { flex: 1, marginRight: 8 }}>
            <FormProSelect
              name="filters.responsible_user_id"
              label="Responsable"
              model="users"
              placeholder="Todos"
              hideLabel
            />
          </View>
          <View style={isMobile ? { width: 200 } : { flex: 1 }}>
            <FormProSelect
              name="filters.product_id"
              label="Producto"
              model="products"
              placeholder="Todos"
              hideLabel
            />
          </View>
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
});
