import { getHelpTopic, openHelp, useHelpTarget } from "@/help";
import React from "react";
import { Appbar } from "react-native-paper";

interface HelpButtonProps {
  /** Tema a abrir. Sin él se usa el de la pantalla actual (ver `HelpTopic.routes`). */
  topic?: string;
  section?: string;
  iconColor?: string;
  size?: number;
}

/**
 * Botón "?" que abre la ayuda del módulo en la sección que corresponde.
 *
 * El AppBar ya lo muestra solo en las pantallas declaradas en el tema; úsalo
 * a mano para una parte puntual de una pantalla o donde no hay AppBar:
 *
 *   <HelpButton topic="transferencias" section="recibir" />
 *
 * No se dibuja si no hay ayuda para la pantalla o el tema no existe.
 */
export default function HelpButton({ topic, section, iconColor, size = 20 }: HelpButtonProps) {
  const current = useHelpTarget();
  const target = topic ? { topic, section } : current;
  const helpTopic = getHelpTopic(target?.topic);

  if (!target || !helpTopic) return null;

  return (
    <Appbar.Action
      icon="help-circle-outline"
      size={size}
      iconColor={iconColor}
      onPress={() => openHelp(target.topic, target.section)}
      accessibilityLabel={`Ayuda: ${helpTopic.title}`}
      testID="help-button"
    />
  );
}
