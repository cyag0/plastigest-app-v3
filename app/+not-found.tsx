import { useTheme } from "@/contexts/ThemeContext";
import { themedStyles, useThemedStyles } from "@/hooks/useThemedStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Stack.Screen options={{ title: "Página no encontrada" }} />
      <View style={styles.container}>
        <Surface style={styles.content} elevation={0}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={120}
              color={colors.warning}
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
              color={colors.textSecondary}
            />
            <Text variant="labelLarge" style={styles.errorCodeText}>
              Error 404
            </Text>
          </View>

          <Link href="/login" asChild style={styles.link}>
            <Button
              mode="contained"
              icon="home"
              buttonColor={colors.primary}
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

const makeStyles = themedStyles((c) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: c.background,
  },
  content: {
    maxWidth: 480,
    width: "100%",
    padding: 40,
    borderRadius: 24,
    backgroundColor: c.card,
    alignItems: "center",
    shadowColor: "transparent",
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: c.warning + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: c.warning + "30",
  },
  title: {
    fontWeight: "bold",
    color: c.text,
    marginBottom: 8,
  },
  subtitle: {
    color: c.textSecondary,
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    color: c.textSecondary,
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
    backgroundColor: c.background,
    borderRadius: 20,
    marginBottom: 32,
  },
  errorCodeText: {
    color: c.textSecondary,
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
    color: c.textSecondary,
    textAlign: "center",
    opacity: 0.7,
  },
}));
