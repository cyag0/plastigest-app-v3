import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, View } from "react-native";
import { initials } from "./userDisplay";

interface Props {
  name?: string | null;
  /** Foto del usuario (la API manda [{ uri }]) o una uri local recién elegida. */
  uri?: string | null;
  size?: number;
}

/**
 * Foto del usuario o, si no tiene, sus iniciales sobre un color suave que
 * depende del nombre (cada persona conserva su color en toda la app). Antes
 * se mostraba el logo de la app en grande cuando no había foto.
 */
export default function UserAvatar({ name, uri, size = 40 }: Props) {
  const { colors } = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted }}
      />
    );
  }

  // Aún sin nombre (alta nueva): silueta en lugar de "?".
  if (!name?.trim()) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surfaceMuted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name="account-outline" size={Math.round(size * 0.55)} color={colors.textMuted} />
      </View>
    );
  }

  const tones = [
    { bg: colors.primarySoft, fg: colors.primary },
    { bg: colors.accentSoft, fg: colors.accent },
    { bg: colors.infoSoft, fg: colors.info },
    { bg: colors.warningSoft, fg: colors.warning },
    { bg: colors.successSoft, fg: colors.success },
  ];
  const seed = (name ?? "").split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const tone = tones[seed % tones.length];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tone.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: tone.fg, fontWeight: "700", fontSize: Math.round(size * 0.38) }}>
        {initials(name)}
      </Text>
    </View>
  );
}
