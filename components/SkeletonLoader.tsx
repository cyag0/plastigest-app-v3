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
          backgroundColor: palette.skeleton,
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

export function SkeletonListCard() {
  return (
    <View style={styles.listCard}>
      <View style={styles.listCardMain}>
        {/* Left - Image skeleton */}
        <View style={styles.listCardLeft}>
          <SkeletonLoader width={50} height={50} borderRadius={8} />
        </View>

        {/* Center - Title and description */}
        <View style={styles.listCardCenter}>
          <SkeletonLoader width="80%" height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="60%" height={12} />
        </View>

        {/* Right - Price and status */}
        <View style={styles.listCardRight}>
          <SkeletonLoader width={60} height={16} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={40} height={12} />
        </View>

        {/* Menu dots */}
        <View style={styles.menuContainer}>
          <SkeletonLoader width={24} height={24} borderRadius={12} />
        </View>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <SkeletonLoader width={40} height={12} />
        <SkeletonLoader width={80} height={12} />
        <SkeletonLoader width={60} height={12} />
      </View>
    </View>
  );
}

export function SkeletonListLoader({ itemCount = 6 }: { itemCount?: number }) {
  return (
    <View style={styles.listContainer}>
      {/* Search bar skeleton */}
      <SkeletonLoader
        width="100%"
        height={48}
        borderRadius={24}
        style={{ marginBottom: 16 }}
      />

      {/* Cards skeleton */}
      {Array.from({ length: itemCount }).map((_, index) => (
        <SkeletonListCard key={index} />
      ))}
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
  listContainer: {
    padding: 16,
  },
  listCard: {
    backgroundColor: "#fff",
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listCardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listCardLeft: {
    justifyContent: "center",
  },
  listCardCenter: {
    flex: 1,
  },
  listCardRight: {
    alignItems: "flex-end",
  },
  menuContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
});
