import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Página no encontrada" }} />
      <View style={styles.container}>
        <Surface style={styles.content} elevation={0}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={120}
              color={palette.warning}
            />
          </View>

          <Text variant="headlineLarge" style={styles.title}>
            ¡Oops!
          </Text>

          <Text variant="titleMedium" style={styles.subtitle}>
            Página no encontrada
          </Text>

          <Text variant="bodyLarge" style={styles.description}>
            La página que buscas no existe o fue movida.
          </Text>

          <View style={styles.errorCode}>
            <MaterialCommunityIcons
              name="file-question-outline"
              size={24}
              color={palette.textSecondary}
            />
            <Text variant="labelLarge" style={styles.errorCodeText}>
              Error 404
            </Text>
          </View>

          <Link href="/login" asChild style={styles.link}>
            <Button
              mode="contained"
              icon="home"
              buttonColor={palette.primary}
              contentStyle={styles.buttonContent}
            >
              Ir al inicio
            </Button>
          </Link>

          <Text variant="bodySmall" style={styles.helpText}>
            Si crees que esto es un error, contacta al soporte técnico
          </Text>
        </Surface>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: palette.background,
  },
  content: {
    maxWidth: 480,
    width: "100%",
    padding: 40,
    borderRadius: 24,
    backgroundColor: palette.card,
    alignItems: "center",
    shadowColor: "transparent",
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: palette.warning + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: palette.warning + "30",
  },
  title: {
    fontWeight: "bold",
    color: palette.text,
    marginBottom: 8,
  },
  subtitle: {
    color: palette.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    color: palette.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  errorCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: palette.background,
    borderRadius: 20,
    marginBottom: 32,
  },
  errorCodeText: {
    color: palette.textSecondary,
    fontWeight: "600",
  },
  link: {
    width: "100%",
    marginBottom: 16,
  },
  buttonContent: {
    height: 48,
  },
  helpText: {
    color: palette.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
});
