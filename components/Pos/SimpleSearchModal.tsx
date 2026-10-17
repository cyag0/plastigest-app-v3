import { SafeAreaView } from "react-native-safe-area-context";
import BarcodeScanner, { BarcodeScannerRef } from "@/components/Form/BarcodeScanner";
import { useTheme } from "@/contexts/ThemeContext";
import { formatMoney } from "@/hooks/usePosCart";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

type Item = App.Entities.PosCatalogItem;

interface Props {
  visible: boolean;
  onClose: () => void;
  search: (query: string, limit?: number) => Item[];
  findByCode: (code: string) => Item | null;
  onSelect: (item: Item) => void;
}

/**
 * Búsqueda de productos en celular: una sola caja de texto y la lista de
 * resultados. Enter con un código exacto agrega directo; la cámara lee
 * códigos de barras.
 */
export default function SimpleSearchModal({ visible, onClose, search, findByCode, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    container: { flex: 1, backgroundColor: c.surface },
    bar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: c.border, paddingRight: 4 },
    input: { flex: 1, fontSize: 18, paddingVertical: 14, color: c.text },
    separator: { height: 1, backgroundColor: c.border },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    name: { fontSize: 16, color: c.text },
    meta: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
    price: { fontSize: 16, fontWeight: "700", color: c.text },
    empty: { textAlign: "center", color: c.textSecondary, padding: 32 },
  }));
  const [query, setQuery] = useState("");
  const scanner = useRef<BarcodeScannerRef>(null);
  const results = useMemo(() => search(query, 40), [search, query]);

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const pick = (item: Item) => {
    onSelect(item);
    onClose();
  };

  const submit = () => {
    const exact = findByCode(query);
    if (exact) pick(exact);
    else if (results.length === 1) pick(results[0]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.bar}>
          <IconButton icon="arrow-left" onPress={onClose} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar producto o código"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={submit}
            style={styles.input}
          />
          <IconButton icon="barcode-scan" onPress={() => scanner.current?.open()} />
        </View>

        <FlatList
          data={results}
          keyExtractor={(i) => i.key}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
          renderItem={({ item }) => {
            const out = item.stock <= 0;
            return (
              <Pressable disabled={out} onPress={() => pick(item)} style={[styles.row, out && { opacity: 0.45 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.code} · {out ? "Sin existencia" : `${item.stock} ${item.unit?.abbreviation ?? ""}`}
                  </Text>
                </View>
                <Text style={styles.price}>{formatMoney(item.price)}</Text>
                <MaterialCommunityIcons name="plus-circle" size={26} color={out ? colors.textMuted : colors.primary} />
              </Pressable>
            );
          }}
        />
      </SafeAreaView>

      <BarcodeScanner
        ref={scanner}
        onScanned={(code) => {
          const item = findByCode(code);
          if (item) pick(item);
          else setQuery(code);
        }}
      />
    </Modal>
  );
}
