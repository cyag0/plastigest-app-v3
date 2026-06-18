import Logo from "@/components/App/Logo";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/contexts/ThemeContext";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useAlerts } from "@/hooks/useAlerts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text as RNText,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const alerts = useAlerts();
  const colors = useColors();
  const router = useRouter();

  // Estados del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  // Rate limit — info devuelta por el backend en headers (X-RateLimit-*)
  // y en el body cuando se devuelve 429. Usamos `remaining` para mostrar
  // "Te quedan X intentos" y `retryAfter` para un contador regresivo
  // cuando el backend nos bloquea.
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [attemptsLimit, setAttemptsLimit] = useState<number | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
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

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("El email es requerido");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Ingresa un email válido");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("La contraseña es requerida");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const isBlocked = retryCountdown !== null && retryCountdown > 0;

  // Tema Paper aplicado a los inputs para que el outlined mode se
  // vea consistente con la paleta del nuevo diseno.
  const paperTheme = {
    colors: {
      primary: colors.primary,
      onSurfaceVariant: colors.textSecondary,
      outline: colors.border,
      surface: colors.surface,
      onSurface: colors.text,
      error: colors.error,
    },
  };

  const styles = useThemedStyles((c) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: "center",
      padding: tokens.spacing[5],
    },
    content: {
      flex: 1,
      justifyContent: "center",
      maxWidth: 480,
      width: "100%",
      alignSelf: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: tokens.spacing[9],
      gap: tokens.spacing[2],
    },
    logoBox: {
      width: 64,
      height: 64,
      borderRadius: tokens.radius.full,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: tokens.spacing[2],
    },
    title: {
      ...tokens.typography.h1,
      color: c.text,
      textAlign: "center",
    },
    subtitle: {
      ...tokens.typography.body,
      color: c.textSecondary,
      textAlign: "center",
    },
    form: {
      padding: tokens.spacing[7],
      borderRadius: tokens.radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      ...tokens.shadow.md,
    },
    formHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: tokens.spacing[7],
      gap: tokens.spacing[3],
    },
    formTitle: {
      ...tokens.typography.h3,
      color: c.text,
    },
    inputContainer: {
      marginBottom: tokens.spacing[3],
    },
    input: {
      backgroundColor: c.surface,
    },
    inputContent: {
      ...tokens.typography.body,
      color: c.text,
    },
    errorBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      backgroundColor: c.errorSoft,
      padding: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      marginVertical: tokens.spacing[2],
      borderLeftWidth: 3,
      borderLeftColor: c.error,
    },
    errorText: {
      ...tokens.typography.bodySm,
      color: c.error,
      flex: 1,
    },
    warningBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      backgroundColor: c.warningSoft,
      padding: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      marginVertical: tokens.spacing[2],
      borderLeftWidth: 3,
      borderLeftColor: c.warning,
    },
    warningText: {
      ...tokens.typography.bodySm,
      color: c.text,
      flex: 1,
    },
    blockedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: tokens.spacing[2],
      backgroundColor: c.errorSoft,
      padding: tokens.spacing[3],
      borderRadius: tokens.radius.md,
      marginVertical: tokens.spacing[2],
      borderLeftWidth: 3,
      borderLeftColor: c.error,
    },
    blockedText: {
      ...tokens.typography.bodySm,
      color: c.error,
      flex: 1,
    },
    blockedCountdown: {
      fontWeight: "700",
      color: c.error,
    },
    submitButton: {
      marginTop: tokens.spacing[6],
      borderRadius: tokens.radius.md,
    },
    submitButtonContent: {
      height: 48,
    },
    forgotPassword: {
      marginTop: tokens.spacing[3],
      alignSelf: "center",
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: tokens.spacing[7],
      gap: tokens.spacing[2],
    },
    footerText: {
      ...tokens.typography.caption,
      color: c.textMuted,
    },
  }));

  const handleLogin = async () => {
    // Limpiar errores previos
    setError("");

    // Si seguimos bloqueados, no dejamos reintentar
    if (isBlocked) {
      alerts.error(`Espera ${retryCountdown} segundos antes de intentar de nuevo.`);
      return;
    }

    // Validar formulario
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      alerts.error("Por favor completa todos los campos correctamente");
      return;
    }

    try {
      // Intentar login
      const result = await login(email.trim().toLowerCase(), password);

      if (!result.success) {
        // Actualizar info de rate limit para la UI (sea 401, 429 u otro).
        if (result.rateLimit) {
          setAttemptsLimit(result.rateLimit.limit);
          setAttemptsRemaining(result.rateLimit.remaining);
          if (result.rateLimit.retryAfter !== undefined) {
            setRetryAfter(result.rateLimit.retryAfter);
            setRetryCountdown(result.rateLimit.retryAfter);
          } else {
            // Si no hubo 429, limpiamos cualquier bloqueo previo
            setRetryAfter(null);
            setRetryCountdown(null);
          }
        }

        // Mostrar error específico según el tipo
        let errorMessage = "";
        if (
          result.error?.includes("CORS") ||
          result.error?.includes("Network")
        ) {
          errorMessage =
            "Error de conexión. Verifica que el servidor esté ejecutándose.";
        } else {
          errorMessage = result.error || "Error desconocido";
        }

        setError(errorMessage);
        alerts.error(errorMessage);
      } else {
        // Login exitoso, limpiar contadores
        setAttemptsRemaining(null);
        setAttemptsLimit(null);
        setRetryAfter(null);
        setRetryCountdown(null);
        alerts.success("Sesión iniciada correctamente");
      }
    } catch (error: any) {
      let errorMessage = "";
      // Manejar diferentes tipos de errores
      if (error.code === "NETWORK_ERROR" || error.message?.includes("CORS")) {
        errorMessage =
          "Error de conexión con el servidor. Verifica la configuración CORS.";
      } else {
        errorMessage = "Error al iniciar sesión. Intenta nuevamente.";
      }

      setError(errorMessage);
      alerts.error(errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header con logo */}
            <View style={styles.header}>
              <Logo
                variant="full"
                size={260}
                wordmarkColor={colors.text}
                taglineColor={colors.textSecondary}
              />
            </View>

            {/* Formulario de login */}
            <View style={styles.form}>
              <View style={styles.formHeader}>
                <MaterialCommunityIcons
                  name="login"
                  size={22}
                  color={colors.primary}
                />
                <RNText style={styles.formTitle}>Iniciar Sesión</RNText>
              </View>

              {/* Campo Email */}
              <View style={styles.inputContainer}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) validateEmail(text);
                  }}
                  onBlur={() => validateEmail(email)}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!emailError}
                  disabled={isLoading}
                  theme={paperTheme}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                  placeholderTextColor={colors.textMuted}
                  left={
                    <TextInput.Icon
                      icon="email-outline"
                      color={emailError ? colors.error : colors.primary}
                    />
                  }
                  style={styles.input}
                  contentStyle={styles.inputContent}
                />
                <HelperText type="error" visible={!!emailError}>
                  {emailError}
                </HelperText>
              </View>

              {/* Campo Contraseña */}
              <View style={styles.inputContainer}>
                <TextInput
                  label="Contraseña"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) validatePassword(text);
                  }}
                  onBlur={() => validatePassword(password)}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  error={!!passwordError}
                  disabled={isLoading}
                  theme={paperTheme}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                  placeholderTextColor={colors.textMuted}
                  left={
                    <TextInput.Icon
                      icon="lock-outline"
                      color={passwordError ? colors.error : colors.primary}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off-outline" : "eye-outline"}
                      onPress={() => setShowPassword(!showPassword)}
                      color={colors.textMuted}
                    />
                  }
                  style={styles.input}
                  contentStyle={styles.inputContent}
                />
                <HelperText type="error" visible={!!passwordError}>
                  {passwordError}
                </HelperText>
              </View>

              {/* Error general */}
              {error ? (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons
                    name="alert-circle"
                    size={18}
                    color={colors.error}
                  />
                  <RNText style={styles.errorText}>{error}</RNText>
                </View>
              ) : null}

              {/* Aviso de intentos restantes (cuando quedan 3 o menos) */}
              {attemptsRemaining !== null &&
                attemptsLimit !== null &&
                retryCountdown === null &&
                attemptsRemaining > 0 &&
                attemptsRemaining <= 3 && (
                  <View style={styles.warningBanner}>
                    <MaterialCommunityIcons
                      name="shield-alert-outline"
                      size={18}
                      color={colors.warning}
                    />
                    <RNText style={styles.warningText}>
                      Te {attemptsRemaining === 1 ? "queda" : "quedan"}{" "}
                      {attemptsRemaining} de {attemptsLimit} intentos. Si
                      excedes el límite tendrás que esperar un minuto.
                    </RNText>
                  </View>
                )}

              {/* Contador regresivo cuando el backend nos bloquea (429) */}
              {retryCountdown !== null && retryCountdown > 0 && (
                <View style={styles.blockedBanner}>
                  <MaterialCommunityIcons
                    name="lock-clock"
                    size={18}
                    color={colors.error}
                  />
                  <RNText style={styles.blockedText}>
                    Demasiados intentos. Podrás volver a intentar en{" "}
                    <RNText style={styles.blockedCountdown}>
                      {retryCountdown}s
                    </RNText>
                  </RNText>
                </View>
              )}

              {/* Botón de login */}
              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.submitButton}
                disabled={isLoading || isBlocked}
                loading={isLoading}
                buttonColor={isBlocked ? colors.textMuted : colors.primary}
                icon={isLoading ? undefined : "login"}
                contentStyle={styles.submitButtonContent}
              >
                {isLoading
                  ? "Iniciando sesión..."
                  : isBlocked
                    ? `Bloqueado (${retryCountdown}s)`
                    : "Iniciar Sesión"}
              </Button>

              {/* Enlace al flujo de recuperación de contraseña */}
              <Button
                mode="text"
                onPress={() => router.push("/forgot-password" as any)}
                style={styles.forgotPassword}
                textColor={colors.primary}
                disabled={isLoading}
                compact
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={14}
                color={colors.textMuted}
              />
              <RNText style={styles.footerText}>
                GCStock v{process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0"}
              </RNText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
