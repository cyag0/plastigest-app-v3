import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { Text } from "react-native";

interface ReadonlyTextProps {
  text: string;
  textStyle?: object;
}

/** Valor de un campo en modo solo lectura (la etiqueta ya va en gris arriba). */
export default function ReadonlyText(props: ReadonlyTextProps) {
  const { colors } = useTheme();
  const empty = !props.text || props.text === "null";
  return (
    <Text
      style={{
        color: empty ? colors.textMuted : colors.text,
        fontSize: 15,
        lineHeight: 22,
        ...props.textStyle,
      }}
    >
      {empty ? "—" : props.text}
    </Text>
  );
}
