import { useTheme } from "@/contexts/ThemeContext";
import React from "react";
import { Text } from "react-native";

interface ReadonlyTextProps {
  text: string;
  textStyle?: object;
}

export default function ReadonlyText(props: ReadonlyTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.textSecondary,
        ...props.textStyle,
      }}
    >
      {props.text && props.text !== "null" ? props.text : "—"}
    </Text>
  );
}
