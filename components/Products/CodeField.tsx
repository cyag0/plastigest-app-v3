/**
 * Código de un producto o de un paquete: se escribe a mano, con un lector USB
 * (teclea en el campo) o con los botones de escanear con la cámara y generar
 * uno. Los botones miden lo mismo que el campo y van a su lado; en solo
 * lectura queda la etiqueta y el valor.
 *
 *   <CodeField name="code" label="Código" maxLength={50} hint="…" />
 */

import { useAppForm } from "@/components/Form/AppForm/AppForm";
import { InputLabel } from "@/components/Form/AppForm/hoc";
import { FormInput } from "@/components/Form/AppInput";
import BarcodeScanner, { type BarcodeScannerRef } from "@/components/Form/BarcodeScanner";
import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormikContext } from "formik";
import React, { useRef } from "react";
import { Pressable, View } from "react-native";

/** Código de 13 dígitos (como un EAN-13): 8 del reloj y 5 al azar. */
export function generateCode(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return timestamp + random;
}

interface CodeFieldProps {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  maxLength?: number;
}

export default function CodeField({ name, label, hint, placeholder, maxLength }: CodeFieldProps) {
  const { readonly } = useAppForm();
  const { setFieldValue } = useFormikContext<any>();
  const scannerRef = useRef<BarcodeScannerRef>(null);
  const styles = useThemedStyles(() => ({
    container: { marginBottom: 18 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    input: { flex: 1, minWidth: 0 },
  }));

  // En el detalle no hay nada que escanear ni generar.
  if (readonly) return <FormInput name={name} label={label} />;

  return (
    <View style={styles.container}>
      <InputLabel label={label} />
      <View style={styles.row}>
        <View style={styles.input}>
          <FormInput
            name={name}
            hint={hint}
            placeholder={placeholder}
            maxLength={maxLength}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel={label}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <SquareButton
          icon="barcode-scan"
          label="Escanear con la cámara"
          onPress={() => scannerRef.current?.open()}
        />
        <SquareButton
          icon="auto-fix"
          label="Generar un código"
          onPress={() => setFieldValue(name, generateCode())}
        />
      </View>
      <BarcodeScanner ref={scannerRef} onScanned={(code) => setFieldValue(name, code)} />
    </View>
  );
}

/** Botón de ícono del alto de un campo (48), con borde, como los campos. */
function SquareButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    button: {
      width: 48,
      height: 48,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { backgroundColor: c.surfaceMuted },
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed, hovered }: any) => [styles.button, (pressed || hovered) && styles.pressed]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.textSecondary} />
    </Pressable>
  );
}
