import palette from "@/constants/palette";
import Services from "@/utils/services";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
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

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Cliente de la venta (F6). Por defecto "Público en general".
 *
 * La búsqueda se hace en el servidor (antes se bajaban 200 clientes y se
 * filtraba aquí: el cliente 201 no aparecía nunca). El listado de clientes
 * pide el permiso customers_list; un cajero sin él solo puede vender a
 * "Público en general" y se le avisa en vez de mostrar la lista vacía.
 */
export default function CustomerPicker({ visible, onClose, onSelect }: Props) {
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [failed, setFailed] = useState(false);
  // Solo se aplica la respuesta de la búsqueda más reciente.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (visible) setQuery("");
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const requestId = ++requestIdRef.current;
    const search = query.trim();
    const timer = setTimeout(
      async () => {
        try {
          setLoading(true);
          setFailed(false);
          const res: any = await Services.customers.index({
            per_page: PAGE_SIZE,
            ...(search ? { search } : {}),
          } as any);
          if (requestId !== requestIdRef.current) return;
          setForbidden(false);
          setCustomers(res?.data?.data ?? res?.data ?? []);
        } catch (e: any) {
          if (requestId !== requestIdRef.current) return;
          setCustomers([]);
          if (e?.response?.status === 403) {
            setForbidden(true);
          } else {
            setFailed(true);
          }
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      },
      search ? SEARCH_DEBOUNCE_MS : 0,
    );

    return () => clearTimeout(timer);
  }, [visible, query]);

  const pick = (c: PosCustomer | null) => {
    onSelect(c);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.bar}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar cliente"
              placeholderTextColor={palette.textMuted}
              autoFocus
              editable={!forbidden}
              style={styles.input}
            />
            {loading && <ActivityIndicator size="small" color={palette.primary} />}
            <IconButton icon="close" onPress={onClose} />
          </View>
          <Pressable onPress={() => pick(null)} style={styles.row}>
            <Text style={styles.name}>Público en general</Text>
          </Pressable>
          {forbidden ? (
            <Text style={styles.notice}>
              Tu usuario no tiene permiso para consultar clientes. La venta se
              registrará a Público en general.
            </Text>
          ) : failed ? (
            <Text style={styles.notice}>No se pudieron cargar los clientes.</Text>
          ) : (
            <FlatList
              data={customers}
              keyExtractor={(c) => String(c.id)}
              style={{ maxHeight: 360 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                !loading && query.trim() ? (
                  <Text style={styles.notice}>Sin resultados para “{query.trim()}”.</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item)} style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: palette.overlay, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 440, backgroundColor: palette.surface, borderRadius: 14, overflow: "hidden" },
  bar: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: palette.border, paddingLeft: 14 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, color: palette.text },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  name: { color: palette.text, fontSize: 15 },
  notice: { color: palette.textSecondary, fontSize: 14, paddingHorizontal: 16, paddingVertical: 14 },
});
