import palette from "@/constants/palette";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: palette.surface,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width={100} height={16} borderRadius={8} />
      <SkeletonLoader width="60%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

export function SkeletonChart({ style }: { style?: any }) {
  return (
    <View style={[styles.chartContainer, style]}>
      <SkeletonLoader width={150} height={20} style={{ marginBottom: 16 }} />
      <SkeletonLoader width="100%" height={200} borderRadius={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: palette.card,
    borderRadius: 12,
  },
  chartContainer: {
    padding: 16,
    backgroundColor: palette.card,
    borderRadius: 12,
  },
});
