/**
 * Buscar un producto para agregarlo al registro: por nombre o código, con un
 * lector de códigos (USB/Bluetooth teclean el código + Enter) o con la cámara.
 * Un código exacto se agrega directo, sin tener que tocar el resultado.
 */

import BarcodeScanner, { BarcodeScannerRef } from "@/components/Form/BarcodeScanner";
import { ListGroup, ListRow } from "@/components/App/ListGroup";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Button, Modal, Portal } from "react-native-paper";
import { qty } from "./productionFormat";

export interface PickedProduct {
  id: number;
  name: string;
  code?: string | null;
  unit_id: number;
  unit_abbreviation?: string | null;
  stock: number;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  /** Filtros del listado de productos (tipo de inventario…). */
  params: Record<string, any>;
  /** Los que ya están en la lista: se muestran como agregados. */
  excludeIds?: number[];
  onSelect: (product: PickedProduct) => void;
}

const toPicked = (p: any): PickedProduct => ({
  id: Number(p.id),
  name: p.name,
  code: p.code,
  unit_id: Number(p.unit_id ?? p.unit?.id),
  unit_abbreviation: p.unit?.abbreviation ?? null,
  stock: Number(p.current_stock ?? 0),
});

export default function ProductPickerSheet({ visible, onDismiss, title, params, excludeIds = [], onSelect }: Props) {
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PickedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const camera = useRef<BarcodeScannerRef>(null);
  const requestId = useRef(0);
  const paramsKey = JSON.stringify(params);

  const styles = useThemedStyles((c) => ({
    card: {
      alignSelf: "center",
      width: "94%",
      maxWidth: 560,
      maxHeight: "86%",
      backgroundColor: c.background,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    title: { fontSize: 18, fontWeight: "700", color: c.text },
    fieldRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    field: {
      flex: 1,
      height: 46,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingHorizontal: 12,
      fontSize: 16,
      color: c.text,
      backgroundColor: c.surface,
      ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : null),
    },
    cameraButton: {
      width: 46,
      height: 46,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    notice: { fontSize: 13, color: c.error },
    empty: { fontSize: 14, color: c.textSecondary, paddingVertical: 16, textAlign: "center" },
  }));

  const fetchProducts = async (text: string): Promise<PickedProduct[]> => {
    const response: any = await Services.products.index(
      { ...params, search: text || undefined, paginated: true, per_page: 30 },
      { silent: true },
    );
    const rows = response?.data?.data ?? response?.data ?? [];
    return (Array.isArray(rows) ? rows : []).map(toPicked);
  };

  useEffect(() => {
    if (!visible) return;
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await fetchProducts(search.trim());
        if (id === requestId.current) setResults(rows);
      } catch {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, visible, paramsKey]);

  const close = () => {
    setSearch("");
    setNotice(null);
    onDismiss();
  };

  const pick = (product: PickedProduct) => {
    if (excludeIds.includes(product.id)) {
      setNotice(`${product.name} ya está en la lista.`);
      return;
    }
    onSelect(product);
    close();
  };

  /** Un código exacto (escaneado o tecleado + Enter) se agrega directo. */
  const pickByCode = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setNotice(null);
    try {
      const rows = await fetchProducts(clean);
      const exact = rows.find((p) => (p.code ?? "").toUpperCase() === clean.toUpperCase());
      if (exact) return pick(exact);
      if (rows.length === 1) return pick(rows[0]);
      setSearch(clean);
      if (rows.length === 0) setNotice(`No hay un producto con el código ${clean}.`);
    } catch {
      setNotice("No se pudo buscar el código. Revisa tu conexión.");
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={close} contentContainerStyle={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.fieldRow}>
          <TextInput
            value={search}
            onChangeText={(text) => {
              setSearch(text);
              setNotice(null);
            }}
            onSubmitEditing={() => pickByCode(search)}
            placeholder="Nombre o código (puedes escanear)"
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.field}
          />
          <Pressable
            onPress={() => camera.current?.open()}
            style={({ pressed }) => [styles.cameraButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Escanear con la cámara"
          >
            <MaterialCommunityIcons name="barcode-scan" size={22} color={colors.primary} />
          </Pressable>
        </View>
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
          {loading && results.length === 0 ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 24 }} />
          ) : results.length === 0 ? (
            <Text style={styles.empty}>Sin resultados.</Text>
          ) : (
            <ListGroup inset={14}>
              {results.map((p) => {
                const added = excludeIds.includes(p.id);
                return (
                  <ListRow
                    key={p.id}
                    title={p.name}
                    subtitle={`${p.code ? `${p.code} · ` : ""}hay ${qty(p.stock, p.unit_abbreviation)}`}
                    meta={added ? "Ya está en la lista" : undefined}
                    onPress={added ? undefined : () => pick(p)}
                    chevron={false}
                    trailing={
                      added ? (
                        <MaterialCommunityIcons name="check" size={18} color={colors.success} />
                      ) : (
                        <MaterialCommunityIcons name="plus" size={20} color={colors.primary} />
                      )
                    }
                  />
                );
              })}
            </ListGroup>
          )}
        </ScrollView>

        <Button mode="text" onPress={close}>
          Cerrar
        </Button>
        <BarcodeScanner ref={camera} onScanned={pickByCode} />
      </Modal>
    </Portal>
  );
}
