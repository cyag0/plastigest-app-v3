/**
 * Recuperar contraseña, paso 3: la contraseña nueva. Con los mismos
 * requisitos a la vista que en Cambiar contraseña (PasswordRules).
 */

import AuthField from "@/components/Auth/AuthField";
import AuthLayout, { AuthLink } from "@/components/Auth/AuthLayout";
import PasswordRules, { passwordRules } from "@/components/Auth/PasswordRules";
import { useColors } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI, rateLimitMessage } from "@/utils/axios";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Formik, type FormikHelpers } from "formik";
import React, { useRef } from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import * as Yup from "yup";

interface Values {
  password: string;
  password_confirmation: string;
}

// Los mensajes no se muestran: lo dicen los requisitos (PasswordRules).
const schema = Yup.object({
  password: Yup.string().min(8, "Debe tener al menos 8 caracteres.").required("Escribe la contraseña nueva."),
  password_confirmation: Yup.string()
    .oneOf([Yup.ref("password")], "Las contraseñas no coinciden.")
    .required("Repite la contraseña nueva."),
});

export default function ResetPasswordConfirmScreen() {
  const router = useRouter();
  const alerts = useAlerts();
  const colors = useColors();
  const { email, code } = useLocalSearchParams<{
    email: string;
    code: string;
  }>();
  const confirmRef = useRef<any>(null);

  const styles = useThemedStyles(() => ({
    fields: { gap: 14 },
    submit: { borderRadius: 12 },
    submitContent: { height: 48 },
    submitLabel: { fontSize: 15, fontWeight: "600" as const, letterSpacing: 0 },
  }));

  const handleSubmit = async (values: Values, { setSubmitting }: FormikHelpers<Values>) => {
    if (!email || !code) {
      alerts.error("Falta información del proceso. Vuelve a empezar.");
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

      alerts.success("Listo, ya puedes entrar con tu contraseña nueva.");
      router.replace("/login");
    } catch (error: any) {
      alerts.error(
        rateLimitMessage(error) ??
          (error?.response?.data?.message || "No se pudo guardar la contraseña. Inténtalo de nuevo."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Crea tu contraseña nueva" subtitle="Con ella entrarás de ahora en adelante.">
      <Formik
        initialValues={{ password: "", password_confirmation: "" }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, submitCount }) => {
          const tried = submitCount > 0;
          return (
            <>
              <View style={styles.fields}>
                <AuthField
                  label="Contraseña nueva"
                  secure
                  value={values.password}
                  onChangeText={handleChange("password")}
                  onBlur={handleBlur("password")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  error={tried && !!errors.password}
                  disabled={isSubmitting}
                />
                <AuthField
                  label="Repite la contraseña nueva"
                  secure
                  inputRef={confirmRef}
                  value={values.password_confirmation}
                  onChangeText={handleChange("password_confirmation")}
                  onBlur={handleBlur("password_confirmation")}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={() => handleSubmit()}
                  error={tried && !!errors.password_confirmation}
                  disabled={isSubmitting}
                />
                <PasswordRules
                  rules={passwordRules(values.password, values.password_confirmation)}
                  showErrors={tried}
                />
              </View>

              <Button
                mode="contained"
                onPress={() => handleSubmit()}
                disabled={isSubmitting}
                loading={isSubmitting}
                buttonColor={colors.primary}
                textColor={colors.primaryForeground}
                style={styles.submit}
                contentStyle={styles.submitContent}
                labelStyle={styles.submitLabel}
              >
                {isSubmitting ? "Guardando…" : "Guardar contraseña"}
              </Button>

              <AuthLink
                label="Volver a iniciar sesión"
                onPress={() => router.replace("/login")}
                disabled={isSubmitting}
              />
            </>
          );
        }}
      </Formik>
    </AuthLayout>
  );
}
