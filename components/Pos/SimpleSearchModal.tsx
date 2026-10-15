import { SafeAreaView } from "react-native-safe-area-context";
import BarcodeScanner, { BarcodeScannerRef } from "@/components/Form/BarcodeScanner";
import palette from "@/constants/palette";
import { formatMoney } from "@/hooks/usePosCart";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
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
            placeholderTextColor={palette.textMuted}
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
                <MaterialCommunityIcons name="plus-circle" size={26} color={out ? palette.textMuted : palette.primary} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  bar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: palette.border, paddingRight: 4 },
  input: { flex: 1, fontSize: 18, paddingVertical: 14, color: palette.text },
  separator: { height: 1, backgroundColor: palette.border },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  name: { fontSize: 16, color: palette.text },
  meta: { fontSize: 12, color: palette.textSecondary, marginTop: 2 },
  price: { fontSize: 16, fontWeight: "700", color: palette.text },
  empty: { textAlign: "center", color: palette.textSecondary, padding: 32 },
});
