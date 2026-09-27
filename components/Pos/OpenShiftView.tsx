import palette from "@/constants/palette";
import Services from "@/utils/services";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

interface Props {
  locationName?: string;
  onOpened: () => void;
}

/**
 * Sin turno abierto: el cajero elige una caja libre de su sucursal y captura
 * el fondo inicial (el efectivo con el que empieza).
 */
export default function OpenShiftView({ locationName, onOpened }: Props) {
  const [registers, setRegisters] = useState<App.Entities.CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await Services.cashRegisters.index({ is_active: 1, per_page: 100 } as any);
        const list: App.Entities.CashRegister[] = res?.data?.data ?? res?.data ?? [];
        setRegisters(list);
        const free = list.filter((r) => !r.open_session);
        if (free.length === 1) setSelected(free[0].id);
      } catch {
        setError("No se pudieron cargar las cajas");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const open = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      setError(null);
      await Services.cashRegisterSessions.open({ cash_register_id: selected, opening_amount: Number(amount) || 0 });
      onOpened();
    } catch (e: any) {
      const data = e?.response?.data;
      setError((data?.errors && (Object.values(data.errors).flat()[0] as string)) || data?.message || "No se pudo abrir el turno");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <MaterialCommunityIcons name="cash-register" size={44} color={palette.primary} />
        <Text variant="headlineSmall" style={styles.title}>Abrir turno</Text>
        <Text style={styles.subtitle}>{locationName}</Text>

        {loading ? (
          <ActivityIndicator style={{ marginVertical: 24 }} />
        ) : registers.length === 0 ? (
          <Text style={styles.empty}>
            Esta sucursal no tiene cajas. Pide a un administrador que la dé de alta en Administración › Cajas.
          </Text>
        ) : (
          <>
            <Text style={styles.label}>Caja</Text>
            <View style={styles.registers}>
              {registers.map((r) => {
                const busy = !!r.open_session;
                const active = selected === r.id;
                return (
                  <Pressable
                    key={r.id}
                    disabled={busy}
                    onPress={() => setSelected(r.id)}
                    style={[styles.register, active && styles.registerActive, busy && styles.registerBusy]}
                  >
                    <Text style={[styles.registerName, active && { color: palette.primary }]}>{r.name}</Text>
                    <Text style={styles.registerMeta}>
                      {busy ? `En uso: ${r.open_session?.user_name ?? "otro cajero"}` : r.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Fondo inicial (efectivo en caja)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.amount}
              onSubmitEditing={open}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Button mode="contained" icon="lock-open-variant" onPress={open} loading={saving} disabled={!selected || saving} style={styles.button} contentStyle={{ height: 48 }}>
              Abrir turno
            </Button>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: palette.background },
  card: { width: "100%", maxWidth: 460, backgroundColor: palette.surface, borderRadius: 16, padding: 24, alignItems: "stretch", borderWidth: 1, borderColor: palette.border },
  title: { textAlign: "center", fontWeight: "700", marginTop: 8, color: palette.text },
  subtitle: { textAlign: "center", color: palette.textSecondary, marginBottom: 16 },
  label: { color: palette.textSecondary, marginTop: 12, marginBottom: 6, fontWeight: "600" },
  registers: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  register: { flexGrow: 1, minWidth: 130, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: palette.border },
  registerActive: { borderColor: palette.primary, backgroundColor: palette.primarySoft },
  registerBusy: { opacity: 0.5 },
  registerName: { fontWeight: "700", color: palette.text },
  registerMeta: { fontSize: 12, color: palette.textSecondary },
  amount: { borderWidth: 1, borderColor: palette.border, borderRadius: 10, padding: 12, fontSize: 22, color: palette.text },
  error: { color: palette.error, marginTop: 10 },
  empty: { color: palette.textSecondary, textAlign: "center", marginVertical: 16 },
  button: { marginTop: 18, borderRadius: 10 },
});
