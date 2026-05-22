import LocationSelector from "@/components/LocationSelector";
import palette from "@/constants/palette";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function SelectLocationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LocationSelector onLocationSelected={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
});
