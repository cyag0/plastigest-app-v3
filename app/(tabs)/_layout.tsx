import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { Appbar } from "react-native-paper";

import palette from "@/constants/palette";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  console.log("Rendering Tab Layout with color scheme:", colorScheme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textSecondary,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          ...Platform.select({
            ios: {
              position: "absolute",
            },
            default: {},
          }),
        },
        headerShown: false,
      }}
      initialRouteName="home"
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="home" iconColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Reportes",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="compass-outline" iconColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: "Compras",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="cart" iconColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="account" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="(stacks)"
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
