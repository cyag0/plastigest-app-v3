/**
 * Recuperar contraseña, paso 1: el correo al que se manda el código.
 * Siguen reset-password-code (el código) y reset-password-confirm (la nueva).
 */

import AuthField from "@/components/Auth/AuthField";
import AuthLayout, { AuthLink } from "@/components/Auth/AuthLayout";
import { useColors } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI, rateLimitMessage } from "@/utils/axios";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Button } from "react-native-paper";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const colors = useColors();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles(() => ({
    submit: { borderRadius: 12 },
    submitContent: { height: 48 },
    submitLabel: { fontSize: 15, fontWeight: "600" as const, letterSpacing: 0 },
  }));

  const validateEmail = (value: string) => {
    const message = !value.trim()
      ? "Escribe tu correo."
      : !EMAIL_PATTERN.test(value.trim())
        ? "Revisa el correo; debe verse como nombre@empresa.com."
        : "";
    setEmailError(message);
    return !message;
  };

  const handleSubmit = async () => {
    if (loading || !validateEmail(email)) return;

    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      await authAPI.forgotPassword(normalized);
      alerts.success("Si el correo está registrado, te llegará un código.");
      router.push({
        pathname: "/reset-password-code" as any,
        params: { email: normalized },
      });
    } catch (error) {
      // 429: se pueden pedir pocos códigos por hora; el servidor dice cuánto
      // esperar.
      alerts.error(rateLimitMessage(error) ?? "No se pudo enviar el código. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Recupera tu contraseña"
      subtitle="Escribe el correo de tu cuenta y te enviaremos un código de 6 dígitos para crear una nueva."
    >
      <AuthField
        label="Correo electrónico"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (emailError) validateEmail(text);
        }}
        onBlur={() => {
          if (email) validateEmail(email);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        error={emailError}
        disabled={loading}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={loading}
        loading={loading}
        buttonColor={colors.primary}
        textColor={colors.primaryForeground}
        style={styles.submit}
        contentStyle={styles.submitContent}
        labelStyle={styles.submitLabel}
      >
        {loading ? "Enviando…" : "Enviar código"}
      </Button>

      <AuthLink label="Volver a iniciar sesión" onPress={() => router.replace("/login")} disabled={loading} />
    </AuthLayout>
  );
}
