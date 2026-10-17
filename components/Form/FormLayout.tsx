/**
 * Piezas de diseño de los formularios, las mismas que usan Procesos y
 * Compras: una columna centrada, secciones con título, campos de dos en dos
 * cuando hay ancho y una barra fija abajo con Cancelar y la acción principal.
 *
 *   <FormSection title="Contacto" description="Para mandarle sus pedidos.">
 *     <FormRow>
 *       <FormPhoneInput name="phone" label="Teléfono" optional />
 *       <FormInput name="email" label="Correo electrónico" optional />
 *     </FormRow>
 *   </FormSection>
 *
 *   <FormFooter
 *     onCancel={goBack}
 *     submitLabel="Guardar cliente"
 *     onSubmit={save}
 *     loading={saving}
 *     note={error}
 *   />
 */

import FormNote from "@/components/Auth/FormNote";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useState } from "react";
import { type LayoutChangeEvent, type StyleProp, Text, View, type ViewStyle } from "react-native";
import { Button } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Ancho máximo de la columna de un formulario (igual que Procesos). */
export const FORM_MAX_WIDTH = 680;

/** Desde este ancho, un FormRow pone sus campos lado a lado. */
const ROW_MIN_WIDTH = 520;

// ─── Sección ────────────────────────────────────────────────────────────────

export function FormSection({
  title,
  description,
  children,
  style,
}: {
  title?: string;
  /** Una línea que explica para qué son estos datos. */
  description?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles((c) => ({
    section: { marginBottom: 14 },
    header: { marginBottom: 14, gap: 2 },
    title: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: c.text },
    description: { fontSize: 13, lineHeight: 18, color: c.textSecondary },
  }));
  return (
    <View style={[styles.section, style]}>
      {(!!title || !!description) && (
        <View style={styles.header}>
          {!!title && (
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          )}
          {!!description && <Text style={styles.description}>{description}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

// ─── Fila de campos ─────────────────────────────────────────────────────────

/**
 * Campos cortos lado a lado (RFC y teléfono, ciudad y código postal) cuando
 * la columna mide al menos 520; en el teléfono quedan uno debajo de otro.
 * `widths` reparte el ancho (p. ej. [2, 1]); por omisión, partes iguales.
 */
export function FormRow({
  children,
  widths,
}: {
  children: React.ReactNode;
  widths?: number[];
}) {
  const [wide, setWide] = useState(false);
  const items = React.Children.toArray(children).filter(Boolean);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width >= ROW_MIN_WIDTH;
    if (next !== wide) setWide(next);
  };
  return (
    <View onLayout={onLayout} style={wide ? { flexDirection: "row", gap: 12 } : undefined}>
      {items.map((child, i) => (
        <View key={i} style={wide ? { flex: widths?.[i] ?? 1, minWidth: 0 } : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
}

// ─── Barra de abajo ─────────────────────────────────────────────────────────

export interface FormFooterProps {
  /** Acción principal: "Guardar cliente", "Registrar salida de 3 pz"… */
  submitLabel?: string;
  onSubmit?: () => void;
  submitIcon?: string;
  loading?: boolean;
  /** Deshabilita la acción principal (p. ej. mientras se guarda). */
  disabled?: boolean;
  /** Botón secundario a la izquierda; sin onCancel no se muestra. */
  cancelLabel?: string;
  onCancel?: () => void;
  /** Aviso arriba de los botones (lo que falta, el error del servidor). */
  note?: React.ReactNode;
  noteTone?: "error" | "warning" | "info";
  /** Botones propios en lugar de Cancelar/acción principal. */
  children?: React.ReactNode;
}

/**
 * Barra fija abajo de la pantalla, a lo ancho y con la columna del
 * formulario adentro: la acción principal siempre está a la vista (antes
 * "Crear" era un botón chico al final del formulario, junto a "Resetear").
 * Va después del ScrollView, en una columna con flex: 1.
 */
export function FormFooter({
  submitLabel = "Guardar",
  onSubmit,
  submitIcon,
  loading,
  disabled,
  cancelLabel = "Cancelar",
  onCancel,
  note,
  noteTone = "error",
  children,
}: FormFooterProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles((c) => ({
    footer: {
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    inner: { width: "100%", maxWidth: FORM_MAX_WIDTH, alignSelf: "center", gap: 10 },
    buttons: { flexDirection: "row", gap: 10 },
  }));

  return (
    <View style={[styles.footer, { paddingBottom: Math.max(12, insets.bottom) }]}>
      <View style={styles.inner}>
        {!!note && <FormNote tone={noteTone}>{note}</FormNote>}
        <View style={styles.buttons}>
          {children ?? (
            <>
              {onCancel && (
                <Button mode="outlined" onPress={onCancel} style={{ flex: 1 }} disabled={loading}>
                  {cancelLabel}
                </Button>
              )}
              {onSubmit && (
                <Button
                  mode="contained"
                  onPress={onSubmit}
                  loading={loading}
                  disabled={disabled || loading}
                  icon={submitIcon}
                  style={{ flex: 1.4 }}
                >
                  {submitLabel}
                </Button>
              )}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
