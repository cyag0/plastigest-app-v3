import React from "react";
import { StyleSheet, TextStyle, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

interface DividerProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Divider: React.FC<DividerProps> = ({ children, style, textStyle }) => (
  <View style={[styles.container, style]}>
    <View style={styles.line} />
    {children ? (
      <Text
        style={[
          textStyle,
          {
            fontWeight: "bold",
            color: "#999",
            marginHorizontal: 8,
          },
        ]}
        variant="titleSmall"
      >
        {children}
      </Text>
    ) : null}
    <View style={styles.line} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#ccc",
  },
});

export default Divider;
