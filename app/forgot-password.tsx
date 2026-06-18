import Logo from "@/components/App/Logo";
import { tokens } from "@/constants/tokens";
import { useColors } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI } from "@/utils/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text as RNText,
  View,
} from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const colors = useColors();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) {
      setEmailError("El email es requerido");
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError("Ingresa un email válido");
      return false;
    }
    setEmailError("");
    return true;
  };

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
    container: { flex: 1, backgroundColor: c.background },
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
      marginBottom: tokens.spacing[7],
      gap: tokens.spacing[2],
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
      marginBottom: tokens.spacing[4],
      gap: tokens.spacing[3],
    },
    formTitle: { ...tokens.typography.h3, color: c.text },
    formSubtitle: {
      ...tokens.typography.bodySm,
      color: c.textSecondary,
      textAlign: "center",
      marginBottom: tokens.spacing[6],
    },
    inputContainer: { marginBottom: tokens.spacing[3] },
    input: { backgroundColor: c.surface },
    inputContent: { ...tokens.typography.body, color: c.text },
    submitButton: { marginTop: tokens.spacing[4], borderRadius: tokens.radius.md },
    submitButtonContent: { height: 48 },
    backButton: { marginTop: tokens.spacing[3] },
  }));

  const handleSubmit = async () => {
    if (!validateEmail(email)) return;

    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      await authAPI.forgotPassword(normalized);
      alerts.success(
        "Si el correo está registrado, recibirás un código de recuperación."
      );
      router.push({
        pathname: "/reset-password-code" as any,
        params: { email: normalized },
      });
    } catch {
      alerts.error("No se pudo enviar el código. Intenta nuevamente.");
    } finally {
      setLoading(false);
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
            <View style={styles.header}>
              <Logo variant="mark" size={72} />
            </View>

            <View style={styles.form}>
              <View style={styles.formHeader}>
                <MaterialCommunityIcons
                  name="lock-question"
                  size={22}
                  color={colors.primary}
                />
                <RNText style={styles.formTitle}>Recuperar contraseña</RNText>
              </View>

              <RNText style={styles.formSubtitle}>
                Ingresa el correo de tu cuenta y te enviaremos un código de 6
                dígitos para restablecer tu contraseña.
              </RNText>

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
                  disabled={loading}
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

              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                disabled={loading}
                loading={loading}
                buttonColor={colors.primary}
                contentStyle={styles.submitButtonContent}
                icon={loading ? undefined : "send"}
              >
                {loading ? "Enviando..." : "Enviar código"}
              </Button>

              <Button
                mode="text"
                onPress={() => router.replace("/login")}
                style={styles.backButton}
                textColor={colors.textSecondary}
                disabled={loading}
                icon="arrow-left"
              >
                Volver al inicio de sesión
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
