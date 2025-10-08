import React from "react";
import { Text, View } from "react-native";

interface ErrorTextProps {
  text: string;
  style?: object;
}

export default function ErrorText(props: ErrorTextProps) {
  return (
    <View style={{}}>
      <Text
        style={{
          color: "red",
          fontSize: 14,
          ...props.style,
        }}
      >
        {props.text}
      </Text>
    </View>
  );
}
