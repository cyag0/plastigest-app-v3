import NotificationBell from "@/components/Notifications/NotificationBell";
import palette from "@/constants/palette";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import { Appbar } from "react-native-paper";
import WebBreadcrumb from "../WebBreadcrumb";

export interface AppBarProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showSearchButton?: boolean;
  showNotificationButton?: boolean;
  showProfileButton?: boolean;
  onSearchPress?: () => void;
  /**
   * @deprecated La campana ahora se gestiona internamente con su propio
   * popover en pantallas grandes o la navegacion a la lista completa en
   * mobile. Este callback se ignora: la campana siempre renderiza
   * `<NotificationBell />` con su logica propia.
   */
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  rightActions?: React.ReactNode;
  leftActions?: React.ReactNode;
  showBreadcrumb?: boolean;
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
  showProfileButton: _showProfileButton = true,
  onSearchPress,
  onNotificationPress: _onNotificationPress,
  onProfilePress,
  rightActions,
  leftActions,
  showBreadcrumb = true,
  backgroundColor = palette.surface,
  titleColor = palette.textSecondary,
  iconColor = palette.textSecondary,
}: AppBarProps) {
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const useBreadcrumbTitle = showBreadcrumb && isWeb;

  const showBackButton = _showBackButton && router.canGoBack();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSearch = () => {
    onSearchPress?.();
  };

  return (
    <View>
      <Appbar.Header
        style={{
          backgroundColor,
          elevation: isWeb ? 0 : 2,
          shadowColor: palette.textSecondary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        {/* Botón de retroceso */}
        {!useBreadcrumbTitle && showBackButton && (
          <Appbar.BackAction onPress={handleBack} iconColor={iconColor} />
        )}

        {/* Acciones del lado izquierdo */}
        {leftActions}

        {/* Título y subtítulo */}
        {useBreadcrumbTitle ? (
          <WebBreadcrumb embedded showSingleItem />
        ) : (
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
        )}

        {/* Botón de búsqueda */}
        {showSearchButton && (
          <Appbar.Action
            icon="magnify"
            onPress={handleSearch}
            iconColor={iconColor}
            rippleColor={palette.primary}
          />
        )}

        {/* Botón de notificaciones — ahora con popover en pantallas grandes */}
        {showNotificationButton && <NotificationBell iconColor={iconColor} />}

        {/* Acciones del lado derecho */}
        {rightActions}
      </Appbar.Header>
    </View>
  );
}

// Componentes auxiliares para acciones personalizadas
AppBar.Action = Appbar.Action;
AppBar.BackAction = Appbar.BackAction;
AppBar.Content = Appbar.Content;
