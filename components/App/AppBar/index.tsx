import palette from "@/constants/palette";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Appbar, Badge } from "react-native-paper";

export interface AppBarProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showSearchButton?: boolean;
  showNotificationButton?: boolean;
  showProfileButton?: boolean;
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  iconColor?: string;
}

export default function AppBar({
  title = "Plastigest",
  subtitle,
  showBackButton: _showBackButton = true,
  showSearchButton = true,
  showNotificationButton = true,
  showProfileButton = true,
  onSearchPress,
  onNotificationPress,
  onProfilePress,
  rightActions,
  leftActions,
  backgroundColor = palette.surface,
  titleColor = palette.textSecondary,
  iconColor = palette.textSecondary,
}: AppBarProps) {
  const router = useRouter();
  const { unreadNotificationsCount } = useAuth();
  const showBackButton = _showBackButton && router.canGoBack();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSearch = () => {
    onSearchPress?.();
  };

  const handleNotifications = () => {
    router.push("/(stacks)/notifications");
  };

  const handleProfile = () => {
    onProfilePress?.();
  };

  console.log(unreadNotificationsCount);

  return (
    <Appbar.Header
      style={{
        backgroundColor,
        elevation: 2,
        shadowColor: palette.textSecondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}
    >
      {/* Botón de retroceso */}
      {showBackButton && (
        <Appbar.BackAction onPress={handleBack} iconColor={iconColor} />
      )}

      {/* Acciones del lado izquierdo */}
      {leftActions}

      {/* Título y subtítulo */}
      <Appbar.Content
        title={title}
        subtitle={subtitle}
        titleStyle={{
          color: titleColor,
          fontWeight: "bold",
          fontSize: 18,
        }}
        subtitleStyle={{
          color: iconColor,
          opacity: 0.7,
          fontSize: 14,
        }}
      />

      {/* Botón de búsqueda */}
      {showSearchButton && (
        <Appbar.Action
          icon="magnify"
          onPress={handleSearch}
          iconColor={iconColor}
          rippleColor={palette.primary}
        />
      )}

      {/* Botón de notificaciones */}
      {showNotificationButton && (
        <View style={{ position: "relative" }}>
          <Appbar.Action
            icon="bell-outline"
            onPress={handleNotifications}
            iconColor={iconColor}
            rippleColor={palette.primary}
          />
          {unreadNotificationsCount > 0 && (
            <Badge
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                backgroundColor: palette.error,
              }}
              size={18}
            >
              {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
            </Badge>
          )}
        </View>
      )}

      {/* Botón de perfil */}
      {showProfileButton && (
        <Appbar.Action
          icon="account-circle-outline"
          onPress={handleProfile}
          iconColor={iconColor}
          rippleColor={palette.primary}
        />
      )}

      {/* Acciones del lado derecho */}
      {rightActions}
    </Appbar.Header>
  );
}

// Componentes auxiliares para acciones personalizadas
AppBar.Action = Appbar.Action;
AppBar.BackAction = Appbar.BackAction;
AppBar.Content = Appbar.Content;
