import { tokens } from "@/constants/tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  ParsedPhone,
  PhoneCountry,
  formatNational,
  formatPhone,
  maxLength,
  nationalDigits,
  parsePhone,
  serializePhone,
} from "@/utils/phone";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  TextInput as NativeTextInput,
  Pressable,
  Text,
  type TextInputInstance,
  View,
} from "react-native";
import { Menu, TextInput } from "react-native-paper";
import MakeForm from "./AppForm/hoc";
import ReadonlyText from "./AppForm/ReadonlyText";
import { useInputPaperTheme } from "./AppInput";

interface AppPhoneInputProps {
  value?: string | null;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  error?: string;
  readonly?: boolean;
  disabled?: boolean;
  /** Por omisión, un número de ejemplo del país elegido. */
  placeholder?: string;
}

/**
 * Campo de teléfono: lada del país a la izquierda (+52, se cambia con un
 * toque) y el número, que se agrupa solo mientras se escribe ("322 123 4567").
 * Abre el teclado de teléfono y acepta el autocompletado del sistema; si se
 * pega con lada ("+52 1 322…", "044 322…") se queda sólo el número.
 *
 * Guarda sólo dígitos (ver utils/phone.ts).
 */
export default function AppPhoneInput(props: AppPhoneInputProps) {
  const { value, onChange, onBlur, hasError, readonly, disabled, placeholder } = props;

  const { colors } = useTheme();
  const paperTheme = useInputPaperTheme();
  const styles = useThemedStyles(makeStyles);
  const inputRef = useRef<TextInputInstance | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Con el campo vacío el valor no dice de qué país es: se recuerda el elegido.
  const [emptyCountry, setEmptyCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);

  if (readonly) return <ReadonlyText text={formatPhone(value)} />;

  const phone: ParsedPhone = value?.trim()
    ? parsePhone(value)
    : { country: emptyCountry, national: "" };
  const { country } = phone;
  const display = formatNational(country, phone.national);

  function emit(next: ParsedPhone) {
    setEmptyCountry(next.country);
    onChange?.(serializePhone(next));
  }

  function handleChangeText(text: string) {
    // Pegado o autocompletado con lada internacional: "+52 1 322…", "+1 555…".
    const plus = text.indexOf("+");
    if (plus >= 0) {
      const pasted = parsePhone(text.slice(plus), country);
      emit({ country: pasted.country, national: pasted.national.slice(0, maxLength(pasted.country)) });
      return;
    }

    let digits = text.replace(/\D/g, "");
    // Borrar un espacio no quita ningún dígito y el espacio volvería a
    // aparecer: se borra el dígito que estaba antes.
    if (text.length < display.length && digits === phone.national) {
      let i = 0;
      while (i < text.length && text[i] === display[i]) i++;
      const before = display.slice(0, i).replace(/\D/g, "").length;
      digits = digits.slice(0, Math.max(0, before - 1)) + digits.slice(before);
    }

    emit({ country, national: nationalDigits(country, digits).slice(0, maxLength(country)) });
  }

  function selectCountry(next: PhoneCountry) {
    setMenuOpen(false);
    emit({ country: next, national: phone.national.slice(0, maxLength(next)) });
    // Al terminar de cerrarse (250 ms) el menú devuelve el foco a la lada:
    // se enfoca el número después, para seguir escribiendo.
    setTimeout(() => inputRef.current?.focus(), 300);
  }

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        value={display}
        onChangeText={handleChangeText}
        onBlur={onBlur}
        error={hasError}
        disabled={disabled}
        placeholder={placeholder ?? country.example}
        keyboardType="phone-pad"
        inputMode="tel"
        autoComplete="tel"
        textContentType="telephoneNumber"
        theme={paperTheme}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.text}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        contentStyle={styles.inputContent}
        outlineStyle={styles.outline}
        render={(inputProps) => (
          <View style={styles.row}>
            {/* El menú envuelve la lada en una vista propia: en una fila esa
                vista se estira y la lada ocupa todo el alto del campo. */}
            <View style={styles.prefixSlot}>
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                contentStyle={{ backgroundColor: colors.surface }}
                anchor={
                  <Pressable
                    onPress={() => setMenuOpen(true)}
                    disabled={disabled}
                    style={styles.prefix}
                    accessibilityRole="button"
                    accessibilityLabel={`Lada de ${country.name}, +${country.dialCode}. Cambiar país`}
                  >
                    <Text style={styles.prefixText}>+{country.dialCode}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
                  </Pressable>
                }
              >
                {PHONE_COUNTRIES.map((c) => (
                  <Menu.Item
                    key={c.id}
                    title={`${c.name}  +${c.dialCode}`}
                    trailingIcon={c.id === country.id ? "check" : undefined}
                    titleStyle={{ color: colors.text }}
                    onPress={() => selectCountry(c)}
                  />
                ))}
              </Menu>
            </View>
            <View style={styles.divider} />
            <NativeTextInput
              {...(inputProps as React.ComponentProps<typeof NativeTextInput>)}
              ref={(node) => {
                // Paper necesita su ref para el foco; el nuestro, para
                // regresar el foco al número después de elegir el país.
                inputProps.ref?.(node as any);
                inputRef.current = node;
              }}
              style={[inputProps.style, styles.nativeInput]}
            />
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = themedStyles((c) => ({
  container: {},
  input: {
    backgroundColor: c.surface,
    height: 48,
  },
  inputContent: {
    fontSize: 15,
    color: c.text,
  },
  outline: {
    borderRadius: tokens.radius.md,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexGrow: 1,
  },
  prefixSlot: {
    flexDirection: "row" as const,
    alignSelf: "stretch" as const,
  },
  prefix: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
    paddingLeft: 14,
    paddingRight: 8,
  },
  prefixText: {
    fontSize: 15,
    color: c.text,
  },
  divider: {
    width: 1,
    alignSelf: "stretch" as const,
    marginVertical: 12,
    backgroundColor: c.border,
  },
  nativeInput: {
    flex: 1,
    paddingLeft: 10,
  },
}));

export const FormPhoneInput = MakeForm(AppPhoneInput);
