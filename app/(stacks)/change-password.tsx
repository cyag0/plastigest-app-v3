/**
 * Cambiar contraseña (desde Perfil).
 *
 * Como los demás formularios de la app: una nota corta de qué pasa al
 * guardar, los campos en una superficie con borde, los requisitos de la
 * nueva a la vista mientras se escribe y los botones abajo (a la derecha en
 * pantallas anchas, a todo lo ancho en el teléfono). Antes llevaba una
 * tarjeta de encabezado que repetía el título, campos subrayados, se
 * estiraba a todo el ancho y no tenía modo oscuro.
 *
 * El backend pide la actual y una nueva de 8 caracteres o más, confirmada.
 * Al cambiarla revoca todas las sesiones, así que aquí se cierra la sesión.
 */

import AuthField from "@/components/Auth/AuthField";
import PasswordRules, { passwordRules } from "@/components/Auth/PasswordRules";
import { tokens } from "@/constants/tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useResponsive } from "@/hooks/useResponsive";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { authAPI } from "@/utils/axios";
import { goBack } from "@/utils/navigation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Formik, type FormikHelpers } from "formik";
import React, { useRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";
import * as Yup from "yup";

interface Values {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

// Los mensajes de la nueva y su confirmación no se muestran: lo dicen los
// requisitos de abajo (PasswordRules), que se marcan en rojo al intentar.
const schema = Yup.object({
  current_password: Yup.string().required("Escribe tu contraseña actual."),
  new_password: Yup.string().min(8, "Debe tener al menos 8 caracteres.").required("Escribe la contraseña nueva."),
  new_password_confirmation: Yup.string()
    .oneOf([Yup.ref("new_password")], "Las contraseñas no coinciden.")
    .required("Repite la contraseña nueva."),
});

export default function ChangePasswordScreen() {
  const { logout } = useAuth();
  const { colors } = useTheme();
  const alerts = useAlerts();
  const { isMobile } = useResponsive();
  const newRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);

  const styles = useThemedStyles((c) => ({
    screen: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    content: { padding: 16, paddingBottom: 40, gap: 16, width: "100%" as const, maxWidth: 560, alignSelf: "center" as const },
    contentWide: { padding: 28 },
    intro: { flexDirection: "row" as const, gap: 10, alignItems: "flex-start" as const },
    introText: { flex: 1, fontSize: 14, lineHeight: 20, color: c.textSecondary },
    card: {
      backgroundColor: c.surface,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      gap: 14,
    },
    divider: { height: 1, backgroundColor: c.border, marginVertical: 4 },
    actions: { gap: 8 },
    actionsWide: { flexDirection: "row" as const, justifyContent: "flex-end" as const, alignItems: "center" as const },
    button: { borderRadius: 12 },
    buttonContent: { height: 46, paddingHorizontal: 8 },
    buttonLabel: { fontSize: 15, fontWeight: "600" as const, letterSpacing: 0 },
  }));

  const handleSubmit = async (values: Values, { setFieldError, setSubmitting }: FormikHelpers<Values>) => {
    let changed = false;
    try {
      // Nombres que valida el backend (antes se mandaba `password` y la
      // petición siempre regresaba 422 en new_password).
      await authAPI.changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
        new_password_confirmation: values.new_password_confirmation,
      });
      changed = true;
    } catch (error: any) {
      const status = error?.response?.status;
      const errors = error?.response?.data?.errors;

      if (status === 422 && errors?.current_password) {
        setFieldError("current_password", errors.current_password[0]);
      } else if (status === 422 && errors?.new_password) {
        // Las reglas de la nueva ya se revisan aquí; si el backend pide algo
        // más, se dice tal cual.
        alerts.error(errors.new_password[0]);
      } else {
        alerts.error(error?.response?.data?.message || "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }

    if (changed) {
      // El backend revoca todos los tokens: se cierra la sesión aquí mismo.
      // Antes era un Alert.alert con botón, que en web no hace nada: la
      // sesión quedaba muerta y el usuario atorado en esta pantalla.
      alerts.success("Listo, cambiaste tu contraseña. Entra de nuevo con la nueva.");
      await logout();
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.content, !isMobile && styles.contentWide]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <MaterialCommunityIcons name="information-outline" size={18} color={colors.textMuted} style={{ marginTop: 1 }} />
            <Text style={styles.introText}>
              Al cambiarla se cerrará tu sesión en todos tus dispositivos, también en este. Después entra con la
              contraseña nueva.
            </Text>
          </View>

          <Formik
            initialValues={{ current_password: "", new_password: "", new_password_confirmation: "" }}
            validationSchema={schema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, submitCount }) => {
              const tried = submitCount > 0;
              const rules = passwordRules(values.new_password, values.new_password_confirmation);
              return (
                <>
                  <View style={styles.card}>
                    <AuthField
                      label="Contraseña actual"
                      secure
                      value={values.current_password}
                      onChangeText={handleChange("current_password")}
                      onBlur={handleBlur("current_password")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => newRef.current?.focus()}
                      error={(touched.current_password || tried) && errors.current_password}
                      disabled={isSubmitting}
                    />

                    <View style={styles.divider} />

                    <AuthField
                      label="Contraseña nueva"
                      secure
                      inputRef={newRef}
                      value={values.new_password}
                      onChangeText={handleChange("new_password")}
                      onBlur={handleBlur("new_password")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => confirmRef.current?.focus()}
                      error={tried && !!errors.new_password}
                      disabled={isSubmitting}
                    />
                    <AuthField
                      label="Repite la contraseña nueva"
                      secure
                      inputRef={confirmRef}
                      value={values.new_password_confirmation}
                      onChangeText={handleChange("new_password_confirmation")}
                      onBlur={handleBlur("new_password_confirmation")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={() => handleSubmit()}
                      error={tried && !!errors.new_password_confirmation}
                      disabled={isSubmitting}
                    />
                    <PasswordRules rules={rules} showErrors={tried} />
                  </View>

                  <View style={[styles.actions, !isMobile && styles.actionsWide]}>
                    {!isMobile && (
                      <Button
                        mode="text"
                        onPress={() => goBack()}
                        disabled={isSubmitting}
                        textColor={colors.textSecondary}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      mode="contained"
                      onPress={() => handleSubmit()}
                      loading={isSubmitting}
                      disabled={isSubmitting}
                      buttonColor={colors.primary}
                      textColor={colors.primaryForeground}
                      style={styles.button}
                      contentStyle={styles.buttonContent}
                      labelStyle={styles.buttonLabel}
                    >
                      Cambiar contraseña
                    </Button>
                    {isMobile && (
                      <Button
                        mode="text"
                        onPress={() => goBack()}
                        disabled={isSubmitting}
                        textColor={colors.textSecondary}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                      >
                        Cancelar
                      </Button>
                    )}
                  </View>
                </>
              );
            }}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
