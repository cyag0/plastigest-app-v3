/**
 * Campo de los formularios de acceso y de contraseñas: el TextInput con
 * contorno de los formularios de la app, con los colores del tema (en modo
 * oscuro también) y el mensaje de error o de ayuda debajo.
 *
 *   <AuthField label="Contraseña" secure value={…} onChangeText={…} error={…} />
 *
 * `secure` oculta el texto y agrega el botón para mostrarlo.
 */

import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { TextInput, type TextInputProps } from "react-native-paper";

export interface AuthFieldProps
  extends Omit<TextInputProps, "error" | "mode" | "secureTextEntry" | "right" | "left" | "theme" | "ref"> {
  label: string;
  /** Texto: borde rojo y el mensaje debajo. `true`: solo el borde. */
  error?: string | boolean | null;
  /** Ayuda bajo el campo cuando no hay error. */
  hint?: string;
  /** Contraseña: texto oculto y botón para mostrarlo. */
  secure?: boolean;
  inputRef?: React.Ref<any>;
}

export default function AuthField({
  label,
  error,
  hint,
  secure,
  inputRef,
  style,
  contentStyle,
  ...rest
}: AuthFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [revealed, setRevealed] = useState(false);
  const theme = useMemo(
    () => ({
      colors: {
        primary: colors.primary,
        onSurfaceVariant: colors.textSecondary,
        outline: colors.border,
        surface: colors.surface,
        onSurface: colors.text,
        error: colors.error,
      },
    }),
    [colors],
  );
  const message = typeof error === "string" && error ? error : null;

  return (
    <View>
      <TextInput
        ref={inputRef}
        mode="outlined"
        label={label}
        error={!!error}
        secureTextEntry={secure && !revealed}
        theme={theme}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.text}
        style={[styles.input, style]}
        contentStyle={[styles.content, contentStyle]}
        right={
          secure ? (
            <TextInput.Icon
              icon={revealed ? "eye-off-outline" : "eye-outline"}
              color={colors.textMuted}
              onPress={() => setRevealed((shown) => !shown)}
              forceTextInputFocus={false}
              accessibilityLabel={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            />
          ) : undefined
        }
        {...rest}
      />
      {message ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  input: { backgroundColor: c.surface },
  content: { fontSize: 15, color: c.text },
  error: { fontSize: 13, lineHeight: 18, color: c.error, marginTop: 6, marginHorizontal: 4 },
  hint: { fontSize: 13, lineHeight: 18, color: c.textMuted, marginTop: 6, marginHorizontal: 4 },
}));
