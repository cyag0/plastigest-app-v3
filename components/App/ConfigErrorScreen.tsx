import { paletteFor, type Palette } from "@/constants/palette";
import { tokens } from "@/constants/tokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getAppVersionLabel } from "@/utils/appVersion";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

/**
 * Pantalla para un build mal configurado (ver utils/appConfig): se muestra en
 * lugar de toda la app, antes de AuthProvider, para que no salga ninguna
 * petición a un servidor equivocado. Sin Paper: va fuera de PaperProvider.
 * También va fuera del ThemeProvider: el tema sale del esquema del sistema.
 */
export default function ConfigErrorScreen({ message }: { message: string }) {
  const scheme = useColorScheme();
  const colors = paletteFor(scheme === "dark" ? "dark" : "light");
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <View style={styles.card}>
        <MaterialCommunityIcons
          name="server-off"
          size={56}
          color={colors.error}
        />
        <Text style={styles.title}>La app no está configurada</Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.hint}>
          Si ves este mensaje, avisa al administrador del sistema. No se
          registró ninguna operación.
        </Text>
        <Text style={styles.version}>GCStock v{getAppVersionLabel()}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: c.background,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.spacing[5],
  },
  card: {
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    gap: tokens.spacing[3],
    padding: tokens.spacing[7],
    borderRadius: tokens.radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  title: {
    ...tokens.typography.h2,
    color: c.text,
    textAlign: "center",
  },
  message: {
    ...tokens.typography.body,
    color: c.textSecondary,
    textAlign: "center",
  },
  hint: {
    ...tokens.typography.bodySm,
    color: c.textMuted,
    textAlign: "center",
  },
  version: {
    ...tokens.typography.caption,
    color: c.textMuted,
    marginTop: tokens.spacing[2],
  },
});
