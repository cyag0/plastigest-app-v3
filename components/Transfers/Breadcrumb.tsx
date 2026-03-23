import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import palette from "@/constants/palette";

interface BreadcrumbItem {
  label: string;
  route?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  currentIndex: number;
}

export default function Breadcrumb({ items, currentIndex }: BreadcrumbProps) {
  const router = useRouter();

  const handleNavigate = (index: number, route?: string) => {
    if (index < currentIndex && route) {
      router.push(route as any);
    }
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View key={index} style={styles.itemWrapper}>
          <Text
            style={[
              styles.label,
              index === currentIndex && styles.activeLabel,
              index < currentIndex && styles.clickableLabel,
            ]}
            onPress={() => handleNavigate(index, item.route)}
          >
            {item.label}
          </Text>

          {index < items.length - 1 && <Text style={styles.separator}>/</Text>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: "#ECE4D8",
  },
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: palette.textSecondary,
  },
  activeLabel: {
    fontWeight: "700",
    color: palette.text,
  },
  clickableLabel: {
    color: palette.primary,
    textDecorationLine: "underline",
  },
  separator: {
    color: palette.textSecondary,
    marginHorizontal: 6,
    fontSize: 12,
  },
});
