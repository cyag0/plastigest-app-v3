import LocationSelector from "@/components/LocationSelector";
import palette from "@/constants/palette";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function SelectLocationScreen() {
  return (
    <View style={styles.container}>
      <LocationSelector />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
});
