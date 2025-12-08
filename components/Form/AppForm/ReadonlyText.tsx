import palette from "@/constants/palette";
import React from "react";
import { Text } from "react-native";

interface ReadonlyTextProps {
  text: string;
  textStyle?: object;
}

export default function ReadonlyText(props: ReadonlyTextProps) {
  return (
    <Text
      style={{
        color: palette.accent,
        ...props.textStyle,
      }}
    >
      {props.text || "-"}
    </Text>
  );
}
