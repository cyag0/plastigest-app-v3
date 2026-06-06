import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const { login, isLoading } = useAuth();
  const alerts = useAlerts();

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
      <LinearGradient
        colors={[palette.card, palette.background]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <KeyboardAvoidingView
              behavior={"position"}
              style={styles.keyboardView}
              keyboardVerticalOffset={30}
            >
              {/* Logo/Header */}
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <MaterialCommunityIcons
                    name="package-variant"
                    size={80}
                    color={palette.error}
                  />
                </View>
                <Text variant="displaySmall" style={styles.title}>
                  PlastiGest
                </Text>
                <Text variant="titleMedium" style={styles.subtitle}>
                  Gestión integral de plásticos
                </Text>
              </View>

              {/* Formulario de login */}
              <Surface style={styles.form} elevation={0}>
                <View style={styles.formHeader}>
                  <MaterialCommunityIcons
                    name="login"
                    size={32}
                    color={palette.primary}
                  />
                  <Text variant="headlineSmall" style={styles.formTitle}>
                    Iniciar Sesión
                  </Text>
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
                    outlineColor={palette.border}
                    activeOutlineColor={palette.primary}
                    left={
                      <TextInput.Icon
                        icon="email-outline"
                        color={emailError ? palette.error : palette.primary}
                      />
                    }
                    style={styles.input}
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
                    outlineColor={palette.border}
                    activeOutlineColor={palette.primary}
                    left={
                      <TextInput.Icon
                        icon="lock-outline"
                        color={passwordError ? palette.error : palette.primary}
                      />
                    }
                    right={
                      <TextInput.Icon
                        icon={showPassword ? "eye-off-outline" : "eye-outline"}
                        onPress={() => setShowPassword(!showPassword)}
                        color={palette.textSecondary}
                      />
                    }
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!passwordError}>
                    {passwordError}
                  </HelperText>
                </View>

                {/* Error general */}
                {error ? (
                  <Surface style={styles.errorContainer} elevation={0}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={20}
                      color={palette.error}
                    />
                    <Text style={styles.errorText}>{error}</Text>
                  </Surface>
                ) : null}

                {/* Aviso de intentos restantes (cuando quedan 3 o menos) */}
                {attemptsRemaining !== null &&
                  attemptsLimit !== null &&
                  retryCountdown === null &&
                  attemptsRemaining > 0 &&
                  attemptsRemaining <= 3 && (
                    <Surface style={styles.warningContainer} elevation={0}>
                      <MaterialCommunityIcons
                        name="shield-alert-outline"
                        size={20}
                        color="#F59E0B"
                      />
                      <Text style={styles.warningText}>
                        Te {attemptsRemaining === 1 ? "queda" : "quedan"}{" "}
                        {attemptsRemaining} de {attemptsLimit} intentos. Si
                        excedes el límite tendrás que esperar un minuto.
                      </Text>
                    </Surface>
                  )}

                {/* Contador regresivo cuando el backend nos bloquea (429) */}
                {retryCountdown !== null && retryCountdown > 0 && (
                  <Surface style={styles.blockedContainer} elevation={0}>
                    <MaterialCommunityIcons
                      name="lock-clock"
                      size={20}
                      color={palette.error}
                    />
                    <Text style={styles.blockedText}>
                      Demasiados intentos. Podrás volver a intentar en{" "}
                      <Text style={styles.blockedCountdown}>
                        {retryCountdown}s
                      </Text>
                    </Text>
                  </Surface>
                )}

                {/* Botón de login */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  disabled={isLoading || isBlocked}
                  loading={isLoading}
                  buttonColor={isBlocked ? palette.textSecondary : palette.primary}
                  icon={isLoading ? undefined : "login"}
                  contentStyle={styles.loginButtonContent}
                >
                  {isLoading
                    ? "Iniciando sesión..."
                    : isBlocked
                      ? `Bloqueado (${retryCountdown}s)`
                      : "Iniciar Sesión"}
                </Button>
              </Surface>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={styles.footer}>
              <MaterialCommunityIcons
                name="shield-check"
                size={16}
                color="#FFFFFF80"
              />
              <Text variant="bodySmall" style={styles.footerText}>
                PlastiGest v{process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
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
    marginBottom: 48,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.error + "15",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "transparent",
    borderWidth: 2,
    borderColor: palette.error + "20",
  },
  title: {
    fontWeight: "bold",
    color: palette.error,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    textAlign: "center",
    color: palette.error,
    opacity: 0.95,
  },
  form: {
    padding: 32,
    borderRadius: 24,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "transparent",
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    gap: 12,
  },
  formTitle: {
    color: palette.text,
    fontWeight: "700",
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.error + "10",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
  },
  errorText: {
    flex: 1,
    color: palette.error,
    fontSize: 13,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  warningText: {
    flex: 1,
    color: "#92400E",
    fontSize: 12,
  },
  blockedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.error + "10",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
  },
  blockedText: {
    flex: 1,
    color: palette.error,
    fontSize: 13,
  },
  blockedCountdown: {
    fontWeight: "700",
    color: palette.error,
  },
  loginButton: {
    marginTop: 24,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "transparent",
  },
  loginButtonContent: {
    height: 48,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    gap: 8,
  },
  footerText: {
    color: "#FFFFFF",
    opacity: 0.8,
  },
});
