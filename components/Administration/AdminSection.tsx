import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Divider, List, Text } from "react-native-paper";

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

interface AdminSectionProps {
  title: string;
  icon: string;
  options: AdminOption[];
}

export default function AdminSection({
  title,
  icon,
  options,
}: AdminSectionProps) {
  const router = useRouter();

  if (options.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Section Header - Sin fondo destacado */}
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={palette.textSecondary}
          style={styles.sectionIcon}
        />
        <Text variant="titleSmall" style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {/* Options List */}
      <Card style={styles.optionsCard}>
        {options.map((option, index) => (
          <View key={option.id}>
            <List.Item
              title={option.title}
              description={option.description}
              onPress={() => router.push(option.route as any)}
              left={(props) => (
                <View
                  style={[
                    styles.listIcon,
                    { backgroundColor: option.color + "20" },
                  ]}
                >
                  <List.Icon
                    {...props}
                    icon={option.icon}
                    color={option.color}
                  />
                </View>
              )}
              right={(props) => (
                <List.Icon
                  {...props}
                  icon="chevron-right"
                  color={palette.textSecondary}
                />
              )}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
              descriptionNumberOfLines={2}
              style={styles.listItem}
            />
            {index < options.length - 1 && <Divider style={styles.divider} />}
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontWeight: "700",
    color: palette.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontSize: 13,
  },
  optionsCard: {
    marginHorizontal: 16,
    backgroundColor: palette.surface,
    borderRadius: 16,
    shadowColor: "transparent",
  },
  listItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  listIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 0,
  },
  listTitle: {
    fontWeight: "600",
    color: palette.text,
    fontSize: 15,
  },
  listDescription: {
    color: palette.textSecondary,
    lineHeight: 18,
    fontSize: 13,
  },
  divider: {
    marginLeft: 72,
    backgroundColor: palette.border,
  },
});
