/**
 * Fila de categorías desplazable: "Todo" y las categorías del catálogo.
 * Píldoras de 48 de alto; la elegida usa el contenedor primario del tema.
 */
import { useThemedStyles } from "@/hooks/useThemedStyles";
import type { KioskCategory } from "@/utils/services/kiosk";
import React from "react";
import { Pressable, ScrollView, Text } from "react-native";

interface Props {
  categories: KioskCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

export default function KioskCategoryBar({ categories, selectedId, onSelect }: Props) {
  const styles = useThemedStyles((c) => ({
    // flexShrink 0: en web el ScrollView se encoge por omisión y la cuadrícula
    // (flex 1) le quitaba el alto: las píldoras salían cortadas a la mitad.
    scroll: { flexGrow: 0, flexShrink: 0, backgroundColor: c.background },
    content: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, alignItems: "center" },
    pill: {
      minHeight: 48,
      paddingHorizontal: 20,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    pillSelected: { backgroundColor: c.primarySoft, borderColor: c.primary },
    pillPressed: { backgroundColor: c.surfaceMuted },
    text: { fontSize: 18, fontWeight: "500", color: c.text },
    textSelected: { fontWeight: "700" },
  }));

  if (categories.length === 0) return null;

  const pill = (id: number | null, name: string, testID: string) => {
    const selected = selectedId === id;
    return (
      <Pressable
        key={testID}
        onPress={() => onSelect(id)}
        style={({ pressed }) => [styles.pill, selected ? styles.pillSelected : pressed && styles.pillPressed]}
        accessibilityRole="button"
        accessibilityLabel={id === null ? "Todos los productos" : `Categoría ${name}`}
        accessibilityState={{ selected }}
        testID={testID}
      >
        <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
          {name}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {pill(null, "Todo", "kiosk-category-all")}
      {categories.map((category) => pill(category.id, category.name, `kiosk-category-${category.id}`))}
    </ScrollView>
  );
}
