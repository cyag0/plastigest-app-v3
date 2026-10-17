/**
 * Recuperar contraseña, paso 2: el código de 6 dígitos que llegó al correo.
 */

import AuthField from "@/components/Auth/AuthField";
import AuthLayout, { AuthLink } from "@/components/Auth/AuthLayout";
import { useColors } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI, rateLimitMessage } from "@/utils/axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "react-native-paper";

export default function ResetPasswordCodeScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const colors = useColors();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const styles = useThemedStyles((c) => ({
    strong: { color: c.text, fontWeight: "600" as const },
    // Los dígitos grandes y separados, centrados en el campo.
    codeInput: { fontSize: 22, letterSpacing: 8, textAlign: "center" as const },
    submit: { borderRadius: 12 },
    submitContent: { height: 48 },
    submitLabel: { fontSize: 15, fontWeight: "600" as const, letterSpacing: 0 },
    links: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "center" as const,
      columnGap: 20,
      rowGap: 4,
    },
  }));

  const validateCode = (value: string) => {
    const message = value.length !== 6 ? "Escribe los 6 dígitos del código." : "";
    setCodeError(message);
    return !message;
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!email) {
      alerts.error("Falta el correo. Vuelve a empezar.");
      router.replace("/forgot-password" as any);
      return;
    }
    if (!validateCode(code)) return;

    setLoading(true);
    try {
      await authAPI.verifyResetCode(email, code);
      router.push({
        pathname: "/reset-password-confirm" as any,
        params: { email, code },
      });
    } catch (error: any) {
      // El motivo va bajo el campo; antes salía también en el aviso de abajo.
      setCodeError(
        rateLimitMessage(error) ??
          (error?.response?.data?.message || "El código no es válido o ya venció. Pide otro."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authAPI.forgotPassword(email);
      setCode("");
      setCodeError("");
      alerts.success("Te enviamos un código nuevo.");
    } catch (error) {
      alerts.error(rateLimitMessage(error) ?? "No se pudo reenviar el código. Inténtalo de nuevo.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Escribe el código"
      subtitle={
        email ? (
          <>
            Lo enviamos a <Text style={styles.strong}>{email}</Text>. Si no lo ves, revisa la carpeta de spam.
          </>
        ) : (
          "Escribe el código de 6 dígitos que te enviamos por correo."
        )
      }
    >
      <AuthField
        label="Código de 6 dígitos"
        value={code}
        onChangeText={(text) => {
          const digits = text.replace(/[^0-9]/g, "").slice(0, 6);
          setCode(digits);
          if (codeError) validateCode(digits);
        }}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        error={codeError}
        disabled={loading}
        contentStyle={styles.codeInput}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={loading || resending}
        loading={loading}
        buttonColor={colors.primary}
        textColor={colors.primaryForeground}
        style={styles.submit}
        contentStyle={styles.submitContent}
        labelStyle={styles.submitLabel}
      >
        {loading ? "Revisando…" : "Continuar"}
      </Button>

      <View style={styles.links}>
        <AuthLink
          label={resending ? "Enviando…" : "Reenviar código"}
          onPress={handleResend}
          disabled={loading || resending}
        />
        <AuthLink
          label="Volver a iniciar sesión"
          onPress={() => router.replace("/login")}
          disabled={loading || resending}
        />
      </View>
    </AuthLayout>
  );
}
