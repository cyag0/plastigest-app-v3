/**
 * Iniciar sesión.
 *
 * La marca, el título y dos campos. Los errores (contraseña incorrecta,
 * intentos, bloqueo) se dicen una sola vez, junto al formulario: antes salían
 * también en el aviso de abajo. Ver AuthLayout para cómo se acomoda en
 * teléfono y en pantallas anchas.
 */

import AuthField from "@/components/Auth/AuthField";
import AuthLayout, { AuthLink } from "@/components/Auth/AuthLayout";
import FormNote from "@/components/Auth/FormNote";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { getAppVersionLabel } from "@/utils/appVersion";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { Button } from "react-native-paper";

// Aviso de privacidad y baja de cuenta: páginas estáticas de public/ que
// piden las tiendas. En la web son del mismo sitio; en el teléfono se abren en
// el sitio web publicado (EXPO_PUBLIC_WEB_URL, por defecto el de producción).
const WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL || "https://app.cocos-francisco.com"
).replace(/\/+$/, "");
const openLegalPage = (page: string) => {
  const url = Platform.OS === "web" ? `/${page}` : `${WEB_URL}/${page}`;
  Linking.openURL(url).catch(() => {});
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  // isLoading del contexto no cambia mientras se inicia sesión: el botón
  // necesita su propio estado para mostrar "cargando" y no aceptar otro Enter.
  const [submitting, setSubmitting] = useState(false);
  const busy = isLoading || submitting;
  const colors = useColors();
  const router = useRouter();

  // Estados del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Rate limit — info devuelta por el backend en headers (X-RateLimit-*)
  // y en el body cuando se devuelve 429. Usamos `remaining` para mostrar
  // "Te quedan X intentos" y `retryAfter` para un contador regresivo
  // cuando el backend nos bloquea.
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Contador regresivo cuando el backend nos devuelve 429. Se reinicia
  // cada segundo y al llegar a 0 el usuario puede intentar de nuevo.
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;
    const id = setTimeout(() => {
      setRetryCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(id);
  }, [retryCountdown]);

  // Validaciones
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value: string) => {
    const message = !value.trim()
      ? "Escribe tu correo."
      : !EMAIL_PATTERN.test(value.trim())
        ? "Revisa el correo; debe verse como nombre@empresa.com."
        : "";
    setEmailError(message);
    return !message;
  };

  // Solo que no esté vacía: el largo mínimo es para las contraseñas nuevas
  // (antes se exigían 6 caracteres aquí y una contraseña más corta, de antes
  // de esa regla, no podía ni intentarse).
  const validatePassword = (value: string) => {
    const message = value ? "" : "Escribe tu contraseña.";
    setPasswordError(message);
    return !message;
  };

  const isBlocked = retryCountdown !== null && retryCountdown > 0;

  const styles = useThemedStyles((c) => ({
    fields: { gap: 14 },
    submit: { borderRadius: 12 },
    submitContent: { height: 48 },
    submitLabel: { fontSize: 15, fontWeight: "600" as const, letterSpacing: 0 },
    footer: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      columnGap: 8,
      rowGap: 4,
    },
    footerText: { fontSize: 12, lineHeight: 18, color: c.textMuted },
    footerLink: { fontSize: 12, lineHeight: 18, color: c.textSecondary, fontWeight: "500" as const },
  }));

  // Enter en el correo pasa a la contraseña; Enter en la contraseña entra.
  const passwordRef = useRef<any>(null);

  const handleLogin = async () => {
    // Enter repetido mientras ya se está entrando, o durante el bloqueo (el
    // aviso con la cuenta regresiva ya está a la vista).
    if (busy || isBlocked) return;

    setError("");
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    setSubmitting(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (!result.success) {
        // Actualizar info de rate limit para la UI (sea 401, 429 u otro).
        if (result.rateLimit) {
          setAttemptsRemaining(result.rateLimit.remaining);
          // Sin 429 se limpia cualquier bloqueo previo.
          setRetryCountdown(result.rateLimit.retryAfter ?? null);
        }
        // AuthContext ya trae el motivo en español (credenciales, bloqueo
        // por intentos o falla de conexión, ver utils/axios).
        setError(result.error || "No se pudo iniciar sesión. Inténtalo de nuevo.");
      } else {
        // Al entrar, la app cambia de pantalla: no hace falta otro aviso.
        setAttemptsRemaining(null);
        setRetryCountdown(null);
      }
    } catch {
      // login() atrapa sus errores; esto sólo cubre algo inesperado.
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // Con 3 o menos intentos antes del bloqueo de un minuto.
  const showAttempts =
    !isBlocked && attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 3;

  return (
    <AuthLayout
      title="Inicia sesión"
      tagline
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Versión {getAppVersionLabel()}</Text>
          <Text style={styles.footerText}>·</Text>
          <Text
            style={styles.footerLink}
            accessibilityRole="link"
            onPress={() => openLegalPage("privacidad.html")}
          >
            Aviso de privacidad
          </Text>
          <Text style={styles.footerText}>·</Text>
          <Text
            style={styles.footerLink}
            accessibilityRole="link"
            onPress={() => openLegalPage("eliminar-cuenta.html")}
          >
            Eliminar mi cuenta
          </Text>
        </View>
      }
    >
      <View style={styles.fields}>
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={emailError}
          disabled={busy}
        />
        <AuthField
          label="Contraseña"
          secure
          inputRef={passwordRef}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (passwordError) validatePassword(text);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          error={passwordError}
          disabled={busy}
        />
        <AuthLink
          label="¿Olvidaste tu contraseña?"
          align="right"
          onPress={() => router.push("/forgot-password" as any)}
          disabled={busy}
        />
      </View>

      {isBlocked ? (
        <FormNote tone="error" icon="timer-sand">
          Demasiados intentos. Podrás volver a intentarlo en {retryCountdown} s.
        </FormNote>
      ) : error ? (
        <FormNote tone="error">{error}</FormNote>
      ) : null}

      {showAttempts && (
        <FormNote tone="warning" icon="shield-alert-outline">
          {attemptsRemaining === 1 ? "Te queda 1 intento" : `Te quedan ${attemptsRemaining} intentos`}; después
          tendrás que esperar un minuto.
        </FormNote>
      )}

      <Button
        mode="contained"
        onPress={handleLogin}
        disabled={busy || isBlocked}
        loading={busy}
        buttonColor={colors.primary}
        textColor={colors.primaryForeground}
        style={styles.submit}
        contentStyle={styles.submitContent}
        labelStyle={styles.submitLabel}
      >
        {busy ? "Entrando…" : isBlocked ? `Espera ${retryCountdown} s` : "Iniciar sesión"}
      </Button>
    </AuthLayout>
  );
}
