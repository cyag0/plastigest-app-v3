import palette from "@/constants/palette";
import React from "react";
import { Text } from "react-native";

interface ReadonlyTextProps {
  text: string;
}

export default function ReadonlyText(props: ReadonlyTextProps) {
  return (
    <Text
      style={{
        color: palette.accent,
      }}
    >
      {props.text}
    </Text>
  );
}
