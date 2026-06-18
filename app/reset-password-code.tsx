import Logo from "@/components/App/Logo";
import { tokens } from "@/constants/tokens";
import { useColors } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI } from "@/utils/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function ResetPasswordCodeScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const colors = useColors();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const validateCode = (value: string) => {
    if (value.length !== 6) {
      setCodeError("El código debe tener 6 dígitos");
      return false;
    }
    setCodeError("");
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
    emailHighlight: { color: c.text, fontWeight: "700" },
    inputContainer: { marginBottom: tokens.spacing[3] },
    input: { backgroundColor: c.surface },
    inputContent: {
      ...tokens.typography.body,
      color: c.text,
      textAlign: "center",
      letterSpacing: 8,
      fontSize: 22,
    },
    submitButton: { marginTop: tokens.spacing[4], borderRadius: tokens.radius.md },
    submitButtonContent: { height: 48 },
    secondaryButton: { marginTop: tokens.spacing[3] },
  }));

  const handleSubmit = async () => {
    if (!email) {
      alerts.error("Falta el correo. Vuelve a iniciar el proceso.");
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
      const message =
        error?.response?.data?.message ||
        "El código es inválido o ya expiró. Intenta nuevamente.";
      setCodeError(message);
      alerts.error(message);
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
      alerts.success("Te enviamos un nuevo código.");
    } catch {
      alerts.error("No se pudo reenviar el código. Intenta nuevamente.");
    } finally {
      setResending(false);
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
                  name="shield-key-outline"
                  size={22}
                  color={colors.primary}
                />
                <RNText style={styles.formTitle}>Ingresa el código</RNText>
              </View>

              <RNText style={styles.formSubtitle}>
                Escribe el código de 6 dígitos que enviamos a{" "}
                <RNText style={styles.emailHighlight}>{email}</RNText>.
              </RNText>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Código de verificación"
                  value={code}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, "").slice(0, 6);
                    setCode(digits);
                    if (codeError) validateCode(digits);
                  }}
                  onBlur={() => validateCode(code)}
                  mode="outlined"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  error={!!codeError}
                  disabled={loading}
                  theme={paperTheme}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                  textColor={colors.text}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                />
                <HelperText type="error" visible={!!codeError}>
                  {codeError}
                </HelperText>
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.submitButton}
                disabled={loading || resending}
                loading={loading}
                buttonColor={colors.primary}
                contentStyle={styles.submitButtonContent}
                icon={loading ? undefined : "check"}
              >
                {loading ? "Verificando..." : "Verificar código"}
              </Button>

              <Button
                mode="text"
                onPress={handleResend}
                style={styles.secondaryButton}
                textColor={colors.primary}
                disabled={loading || resending}
                loading={resending}
                icon="email-sync-outline"
              >
                Reenviar código
              </Button>

              <Button
                mode="text"
                onPress={() => router.replace("/login")}
                textColor={colors.textSecondary}
                disabled={loading || resending}
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
