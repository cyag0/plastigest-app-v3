import Logo from "@/components/App/Logo";
import { tokens } from "@/constants/tokens";
import { useColors } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI } from "@/utils/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Formik } from "formik";
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
import * as Yup from "yup";

const schema = Yup.object({
  password: Yup.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .required("La contraseña es requerida"),
  password_confirmation: Yup.string()
    .oneOf([Yup.ref("password")], "Las contraseñas no coinciden")
    .required("Confirma tu contraseña"),
});

export default function ResetPasswordConfirmScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const colors = useColors();
  const { email, code } = useLocalSearchParams<{
    email: string;
    code: string;
  }>();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleSubmit = async (
    values: { password: string; password_confirmation: string },
    { setSubmitting }: any
  ) => {
    if (!email || !code) {
      alerts.error("Falta información del proceso. Vuelve a iniciarlo.");
      router.replace("/forgot-password" as any);
      return;
    }

    try {
      await authAPI.resetPassword({
        email,
        code,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });

      alerts.success("Tu contraseña fue restablecida. Ya puedes iniciar sesión.");
      router.replace("/login");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "No se pudo restablecer la contraseña. Intenta nuevamente.";
      alerts.error(message);
    } finally {
      setSubmitting(false);
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
                  name="lock-reset"
                  size={22}
                  color={colors.primary}
                />
                <RNText style={styles.formTitle}>Nueva contraseña</RNText>
              </View>

              <RNText style={styles.formSubtitle}>
                Crea una nueva contraseña para tu cuenta. Debe tener al menos 8
                caracteres.
              </RNText>

              <Formik
                initialValues={{ password: "", password_confirmation: "" }}
                validationSchema={schema}
                onSubmit={handleSubmit}
              >
                {({
                  values,
                  errors,
                  touched,
                  handleChange,
                  handleBlur,
                  handleSubmit,
                  isSubmitting,
                }) => (
                  <>
                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Nueva contraseña"
                        value={values.password}
                        onChangeText={handleChange("password")}
                        onBlur={handleBlur("password")}
                        mode="outlined"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        error={touched.password && !!errors.password}
                        disabled={isSubmitting}
                        theme={paperTheme}
                        outlineColor={colors.border}
                        activeOutlineColor={colors.primary}
                        textColor={colors.text}
                        left={
                          <TextInput.Icon
                            icon="lock-plus-outline"
                            color={colors.primary}
                          />
                        }
                        right={
                          <TextInput.Icon
                            icon={showPassword ? "eye-off-outline" : "eye-outline"}
                            onPress={() => setShowPassword((v) => !v)}
                            color={colors.textMuted}
                          />
                        }
                        style={styles.input}
                        contentStyle={styles.inputContent}
                      />
                      <HelperText
                        type="error"
                        visible={touched.password && !!errors.password}
                      >
                        {errors.password}
                      </HelperText>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        label="Confirmar contraseña"
                        value={values.password_confirmation}
                        onChangeText={handleChange("password_confirmation")}
                        onBlur={handleBlur("password_confirmation")}
                        mode="outlined"
                        secureTextEntry={!showConfirm}
                        autoCapitalize="none"
                        autoCorrect={false}
                        error={
                          touched.password_confirmation &&
                          !!errors.password_confirmation
                        }
                        disabled={isSubmitting}
                        theme={paperTheme}
                        outlineColor={colors.border}
                        activeOutlineColor={colors.primary}
                        textColor={colors.text}
                        left={
                          <TextInput.Icon
                            icon="lock-check-outline"
                            color={colors.primary}
                          />
                        }
                        right={
                          <TextInput.Icon
                            icon={showConfirm ? "eye-off-outline" : "eye-outline"}
                            onPress={() => setShowConfirm((v) => !v)}
                            color={colors.textMuted}
                          />
                        }
                        style={styles.input}
                        contentStyle={styles.inputContent}
                      />
                      <HelperText
                        type="error"
                        visible={
                          touched.password_confirmation &&
                          !!errors.password_confirmation
                        }
                      >
                        {errors.password_confirmation}
                      </HelperText>
                    </View>

                    <Button
                      mode="contained"
                      onPress={() => handleSubmit()}
                      style={styles.submitButton}
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      buttonColor={colors.primary}
                      contentStyle={styles.submitButtonContent}
                      icon={isSubmitting ? undefined : "lock-check"}
                    >
                      {isSubmitting ? "Guardando..." : "Restablecer contraseña"}
                    </Button>

                    <Button
                      mode="text"
                      onPress={() => router.replace("/login")}
                      style={styles.backButton}
                      textColor={colors.textSecondary}
                      disabled={isSubmitting}
                      icon="arrow-left"
                    >
                      Volver al inicio de sesión
                    </Button>
                  </>
                )}
              </Formik>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
