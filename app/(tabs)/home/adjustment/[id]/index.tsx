import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { Card, Divider, Text } from "react-native-paper";

interface InventoryAdjustmentDetail {
  id: number;
  direction: "in" | "out";
  quantity: number;
  previous_stock?: number;
  new_stock?: number;
  notes?: string;
  applied_at?: string;
  reason_code?: string;
  reason_code_label?: string;
  product?: {
    id: number;
    name: string;
    sku?: string;
  };
  unit?: {
    id: number;
    name: string;
    code?: string;
  };
  location?: {
    id: number;
    name: string;
  };
  created_by_user?: {
    id: number;
    name: string;
  };
  evidence_files?: Array<{
    name?: string;
    uri?: string;
    url?: string;
  }>;
  content?: {
    evidence_files?: Array<{
      name?: string;
      uri?: string;
      url?: string;
    }>;
  };
}

export default function AdjustmentDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = useMemo(() => {
    const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [params.id]);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InventoryAdjustmentDetail | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await Services.inventoryAdjustments.show(id);
        setDetail(response.data?.data || null);
      } catch (error) {
        console.error("Error loading adjustment detail:", error);
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text>Cargando detalle...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text>No se pudo cargar el detalle del ajuste.</Text>
      </View>
    );
  }

  const isIncrease = detail.direction === "in";
  const evidenceFiles =
    detail.evidence_files || detail.content?.evidence_files || [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text variant="titleMedium" style={{ fontWeight: "700" }}>
              Ajuste #{detail.id}
            </Text>
            <MaterialCommunityIcons
              name={isIncrease ? "arrow-up-circle" : "arrow-down-circle"}
              size={28}
              color={isIncrease ? palette.success : palette.red}
            />
          </View>

          <Divider />

          <Row label="Producto" value={detail.product?.name || "-"} />
          <Row label="SKU" value={detail.product?.sku || "-"} />
          <Row label="Tipo" value={isIncrease ? "Entrada" : "Salida"} />
          <Row
            label="Cantidad"
            value={`${Number(detail.quantity || 0).toFixed(2)} ${detail.unit?.code || detail.unit?.name || ""}`.trim()}
          />
          <Row label="Razón" value={detail.reason_code_label || detail.reason_code || "-"} />
          <Row label="Ubicación" value={detail.location?.name || "-"} />
          <Row label="Fecha" value={formatDate(detail.applied_at || "") || "-"} />
          <Row label="Usuario" value={detail.created_by_user?.name || "-"} />
          <Row label="Stock Anterior" value={toFixedValue(detail.previous_stock)} />
          <Row label="Stock Nuevo" value={toFixedValue(detail.new_stock)} />
          <Row label="Notas" value={detail.notes || "-"} />

          {evidenceFiles.length > 0 && (
            <>
              <Divider />
              <View style={{ gap: 8 }}>
                <Text variant="titleSmall" style={{ fontWeight: "700" }}>
                  Evidencias ({evidenceFiles.length})
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {evidenceFiles.map((file, index) => {
                    const uri = file.uri || file.url || "";
                    if (!uri) return null;

                    return (
                      <View
                        key={`${file.name || "evidence"}-${index}`}
                        style={{
                          width: 100,
                          height: 100,
                          borderRadius: 10,
                          overflow: "hidden",
                          borderWidth: 1,
                          borderColor: "#E5E5E5",
                        }}
                      >
                        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text variant="bodyMedium" style={{ color: palette.textSecondary }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ fontWeight: "600", flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy} ${mm} ${dd}`;
}

function toFixedValue(value?: number) {
  if (value === undefined || value === null) return "-";
  return Number(value).toFixed(2);
}
