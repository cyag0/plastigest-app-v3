import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { authAPI } from "@/utils/axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import React, { useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";
import * as Yup from "yup";

const schema = Yup.object({
  current_password: Yup.string().required("La contraseña actual es requerida"),
  new_password: Yup.string()
    .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
    .required("La nueva contraseña es requerida"),
  new_password_confirmation: Yup.string()
    .oneOf([Yup.ref("new_password")], "Las contraseñas no coinciden")
    .required("Confirma tu nueva contraseña"),
});

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (
    values: {
      current_password: string;
      new_password: string;
      new_password_confirmation: string;
    },
    { setFieldError, setSubmitting }: any
  ) => {
    try {
      await authAPI.changePassword({
        current_password: values.current_password,
        password: values.new_password,
        password_confirmation: values.new_password_confirmation,
      });

      Alert.alert(
        "Contraseña actualizada",
        "Tu contraseña fue cambiada exitosamente. Por seguridad, se cerrará la sesión en todos los dispositivos.",
        [{ text: "Aceptar", onPress: () => logout() }]
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const errors = error?.response?.data?.errors;

      if (status === 422 && errors?.current_password) {
        setFieldError("current_password", errors.current_password[0]);
      } else if (status === 422 && errors?.new_password) {
        setFieldError("new_password", errors.new_password[0]);
      } else {
        Alert.alert("Error", "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={48}
              color={palette.primary}
            />
            <Text variant="titleLarge" style={styles.headerTitle}>
              Cambiar Contraseña
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtitle}>
              Al cambiar tu contraseña, se cerrará la sesión en todos los
              dispositivos vinculados.
            </Text>
          </Card.Content>
        </Card>

        {/* Form */}
        <Formik
          initialValues={{
            current_password: "",
            new_password: "",
            new_password_confirmation: "",
          }}
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
            <Card style={styles.formCard}>
              <Card.Content style={styles.formContent}>
                {/* Current password */}
                <View style={styles.fieldWrapper}>
                  <TextInput
                    label="Contraseña actual"
                    value={values.current_password}
                    onChangeText={handleChange("current_password")}
                    onBlur={handleBlur("current_password")}
                    secureTextEntry={!showCurrent}
                    autoCapitalize="none"
                    autoCorrect={false}
                    left={<TextInput.Icon icon="lock-outline" />}
                    right={
                      <TextInput.Icon
                        icon={showCurrent ? "eye-off" : "eye"}
                        onPress={() => setShowCurrent((v) => !v)}
                      />
                    }
                    error={touched.current_password && !!errors.current_password}
                    style={styles.input}
                  />
                  {touched.current_password && errors.current_password && (
                    <HelperText type="error" visible>
                      {errors.current_password}
                    </HelperText>
                  )}
                </View>

                {/* New password */}
                <View style={styles.fieldWrapper}>
                  <TextInput
                    label="Nueva contraseña"
                    value={values.new_password}
                    onChangeText={handleChange("new_password")}
                    onBlur={handleBlur("new_password")}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    left={<TextInput.Icon icon="lock-plus-outline" />}
                    right={
                      <TextInput.Icon
                        icon={showNew ? "eye-off" : "eye"}
                        onPress={() => setShowNew((v) => !v)}
                      />
                    }
                    error={touched.new_password && !!errors.new_password}
                    style={styles.input}
                  />
                  {touched.new_password && errors.new_password && (
                    <HelperText type="error" visible>
                      {errors.new_password}
                    </HelperText>
                  )}
                </View>

                {/* Confirm new password */}
                <View style={styles.fieldWrapper}>
                  <TextInput
                    label="Confirmar nueva contraseña"
                    value={values.new_password_confirmation}
                    onChangeText={handleChange("new_password_confirmation")}
                    onBlur={handleBlur("new_password_confirmation")}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    left={<TextInput.Icon icon="lock-check-outline" />}
                    right={
                      <TextInput.Icon
                        icon={showConfirm ? "eye-off" : "eye"}
                        onPress={() => setShowConfirm((v) => !v)}
                      />
                    }
                    error={
                      touched.new_password_confirmation &&
                      !!errors.new_password_confirmation
                    }
                    style={styles.input}
                  />
                  {touched.new_password_confirmation &&
                    errors.new_password_confirmation && (
                      <HelperText type="error" visible>
                        {errors.new_password_confirmation}
                      </HelperText>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <Button
                    mode="outlined"
                    onPress={() => router.back()}
                    style={styles.cancelButton}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => handleSubmit()}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.submitButton}
                    buttonColor={palette.primary}
                  >
                    Cambiar contraseña
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </Formik>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    backgroundColor: palette.primary + "15",
  },
  headerContent: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  headerTitle: {
    fontWeight: "bold",
    color: palette.text,
    textAlign: "center",
  },
  headerSubtitle: {
    color: palette.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  formCard: {
    backgroundColor: "#fff",
  },
  formContent: {
    gap: 4,
    paddingVertical: 16,
  },
  fieldWrapper: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: "transparent",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
