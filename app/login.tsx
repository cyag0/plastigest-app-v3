import { useAuth } from "@/contexts/AuthContext";
import { useAlerts } from "@/hooks/useAlerts";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const theme = useTheme();
  const { login, isLoading } = useAuth();
  const alerts = useAlerts();

  // Estados del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

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

  const handleLogin = async () => {
    // Limpiar errores previos
    setError("");

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
        alerts.success("Sesión iniciada correctamente");
      }
    } catch (error: any) {
      console.error("Login error:", error);

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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo/Header */}
            <View style={styles.header}>
              <Text
                variant="headlineLarge"
                style={[styles.title, { color: theme.colors.primary }]}
              >
                PlastiGest
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Gestión integral de plásticos
              </Text>
            </View>

            {/* Formulario de login */}
            <Surface
              style={[styles.form, { backgroundColor: theme.colors.surface }]}
              elevation={2}
            >
              <Text
                variant="headlineSmall"
                style={[styles.formTitle, { color: theme.colors.onSurface }]}
              >
                Iniciar Sesión
              </Text>

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
                  left={<TextInput.Icon icon="email" />}
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
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                <HelperText type="error" visible={!!passwordError}>
                  {passwordError}
                </HelperText>
              </View>

              {/* Error general */}
              {error ? (
                <HelperText
                  type="error"
                  visible={true}
                  style={styles.errorText}
                >
                  {error}
                </HelperText>
              ) : null}

              {/* Botón de login */}
              <Button
                mode="contained"
                onPress={handleLogin}
                style={styles.loginButton}
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </Surface>

            {/* Footer */}
            <View style={styles.footer}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                PlastiGest v{process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0"}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
  },
  form: {
    padding: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  formTitle: {
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 16,
  },
  errorText: {
    textAlign: "center",
    marginVertical: 8,
  },
  loginButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
});
