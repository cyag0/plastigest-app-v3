import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

export interface PosCustomer {
  id: number;
  name: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (customer: PosCustomer | null) => void;
}

/** Cliente de la venta (F6). Por defecto "Público en general". */
export default function CustomerPicker({ visible, onClose, onSelect }: Props) {
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    (async () => {
      try {
        const res: any = await Services.customers.index({ per_page: 200 } as any);
        setCustomers(res?.data?.data ?? res?.data ?? []);
      } catch {
        setCustomers([]);
      }
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? customers.filter((c) => c.name?.toLowerCase().includes(q)) : customers;
  }, [customers, query]);

  const pick = (c: PosCustomer | null) => {
    onSelect(c);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.bar}>
            <TextInput value={query} onChangeText={setQuery} placeholder="Buscar cliente" autoFocus style={styles.input} />
            <IconButton icon="close" onPress={onClose} />
          </View>
          <Pressable onPress={() => pick(null)} style={styles.row}>
            <Text style={styles.name}>Público en general</Text>
          </Pressable>
          <FlatList
            data={filtered}
            keyExtractor={(c) => String(c.id)}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item)} style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,.45)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 440, backgroundColor: palette.surface, borderRadius: 14, overflow: "hidden" },
  bar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: palette.border, paddingLeft: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, color: palette.text },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  name: { color: palette.text, fontSize: 15 },
});
