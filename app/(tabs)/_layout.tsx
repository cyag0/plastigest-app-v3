import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Appbar } from "react-native-paper";

import AppBar from "@/components/App/AppBar";
import NavigationSidebar from "@/components/App/NavigationSidebar";
import palette from "@/constants/palette";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isWeb = Platform.OS === "web";

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <NavigationSidebar />
        <View style={styles.webContent}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: "none" },
              headerShown: false,
            }}
            initialRouteName="home"
          >
            <Tabs.Screen name="home" />
            <Tabs.Screen name="inventory" />
            <Tabs.Screen name="reports" />
            <Tabs.Screen name="administration" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen
              name="(stacks)"
              options={{
                tabBarButton: () => null,
              }}
            />
          </Tabs>
        </View>
      </View>
    );
  }

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
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="home" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventario",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="archive" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="reports"
        options={{
          title: "Dashboard",
          headerShown: true,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              onSearchPress={() => console.log("Search pressed")}
              onNotificationPress={() => console.log("Notifications pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
          ),
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="compass-outline" iconColor={color} size={24} />
          ),
        }}
      />

      <Tabs.Screen
        name="administration"
        options={{
          title: "Administración",
          tabBarIcon: ({ color, focused }) => (
            <Appbar.Action icon="cog" iconColor={color} size={24} />
          ),
          headerShown: false,
          header: ({ options, route }) => (
            <AppBar
              title={options.title || route.name}
              onSearchPress={() => console.log("Search pressed")}
              onProfilePress={() => console.log("Profile pressed")}
            />
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

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: palette.surface,
    padding: 24,
    paddingLeft: 0,
  },
  webContent: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 8,
  },
});
