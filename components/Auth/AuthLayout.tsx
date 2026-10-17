/**
 * Pantallas de acceso (iniciar sesión y recuperar contraseña): la marca
 * arriba, un título y el formulario.
 *
 * En el teléfono el formulario va directo sobre el fondo: una tarjeta dentro
 * de la pantalla solo les quitaba ancho a los campos. En tableta y
 * escritorio va en una tarjeta con borde, al centro.
 */

import Logo from "@/components/App/Logo";
import { tokens } from "@/constants/tokens";
import { useResponsive } from "@/hooks/useResponsive";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AuthLayoutProps {
  title: string;
  /** Una o dos líneas bajo el título; puede llevar <Text> para resaltar. */
  subtitle?: React.ReactNode;
  /** Lema bajo el nombre ("Gestión de inventario y sucursales"). */
  tagline?: boolean;
  /** Debajo de la tarjeta (versión, enlaces legales). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, tagline, footer, children }: AuthLayoutProps) {
  const styles = useThemedStyles(makeStyles);
  const { isMobile } = useResponsive();
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <BrandLockup tagline={tagline} />
            <View style={[styles.panel, !isMobile && styles.card]}>
              <View style={styles.heading}>
                <Text style={styles.title} accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {children}
            </View>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Ícono y nombre de la marca. El nombre va como texto de la app (Inter): en
 * el SVG del logo salía con la fuente que tuviera el sistema, distinta en
 * cada equipo, y "Stock" en verde oscuro casi no se leía en modo oscuro.
 */
export function BrandLockup({ tagline }: { tagline?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.brand} accessible accessibilityLabel="GCStock">
      <Logo variant="mark" size={44} />
      <View>
        <Text style={styles.wordmark}>
          GC<Text style={styles.wordmarkAccent}>Stock</Text>
        </Text>
        {tagline && <Text style={styles.tagline}>Gestión de inventario y sucursales</Text>}
      </View>
    </View>
  );
}

/** Enlace en texto dentro de un formulario de acceso ("Volver a iniciar sesión"). */
export function AuthLink({
  label,
  onPress,
  disabled,
  align = "center",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  align?: "center" | "right";
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="link"
      style={({ pressed }) => [
        styles.link,
        align === "right" && styles.linkRight,
        (pressed || disabled) && styles.linkDim,
      ]}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = themedStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  column: { width: "100%", maxWidth: 420, alignSelf: "center", gap: 28 },

  brand: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  wordmark: { fontSize: 26, lineHeight: 30, fontWeight: "700", letterSpacing: -0.5, color: c.text },
  wordmarkAccent: { color: c.primary },
  tagline: { fontSize: 12, lineHeight: 16, color: c.textSecondary },

  panel: { gap: 20 },
  card: {
    backgroundColor: c.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: 28,
  },
  heading: { gap: 6 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
    color: c.text,
    textAlign: "center",
  },
  subtitle: { fontSize: 14, lineHeight: 20, color: c.textSecondary, textAlign: "center" },

  link: { alignSelf: "center", paddingVertical: 4 },
  linkRight: { alignSelf: "flex-end" },
  linkDim: { opacity: 0.6 },
  linkText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: c.primary },
}));
