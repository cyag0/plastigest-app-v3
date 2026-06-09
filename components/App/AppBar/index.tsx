import NotificationBell from "@/components/Notifications/NotificationBell";
import UserMenu from "@/components/App/UserMenu";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, TouchableOpacity, View } from "react-native";
import { Appbar } from "react-native-paper";
import SearchInput from "../SearchInput";
import WebBreadcrumb from "../WebBreadcrumb";

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
  showBreadcrumb?: boolean;
  backgroundColor?: string;
  titleColor?: string;
  iconColor?: string;
}

/**
 * AppBar rediseñado v2: fondo blanco, borde inferior sutil,
 * search global en el centro (desktop), campana y avatar a la
 * derecha. Inspirado en Linear/Notion/Stripe Dashboard.
 *
 * Mantiene compatibilidad con el layout existente
 * (headerShown de expo-router) para no romper la navegación.
 */
export default function AppBar({
  title = "Plastigest",
  subtitle,
  showBackButton = true,
  showSearchButton = true,
  showNotificationButton = true,
  showProfileButton = true,
  onSearchPress,
  rightActions,
  leftActions,
  showBreadcrumb = true,
  backgroundColor,
  titleColor,
  iconColor,
}: AppBarProps) {
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const useBreadcrumbTitle = showBreadcrumb && isWeb;
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  const styles = useThemedStyles((colors) => ({
    container: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: backgroundColor ?? colors.surface,
    },
    header: { backgroundColor: "transparent", justifyContent: "space-between", paddingHorizontal: 16 },
    titleSlot: { flexShrink: 1 },
    searchSlot: {
      flex: 1,
      maxWidth: 480,
      marginHorizontal: 16,
    },
    spacer: { flex: 0 },
    userTrigger: { padding: 4, marginRight: 4 },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 9999,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarInner: { margin: 0, padding: 0 },
    avatarIcon: { margin: 0 },
  }));

  const canShowBack = showBackButton && router.canGoBack();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSearch = () => {
    onSearchPress?.();
  };

  // Trigger del user menu: avatar + chevron
  const userMenuTrigger = (
    <TouchableOpacity
      onPress={() => setUserMenuVisible(true)}
      style={styles.userTrigger}
      accessibilityLabel="Menu de usuario"
    >
      <View style={styles.avatar}>
        <View style={styles.avatarInner}>
          <Appbar.Action
            icon="account-circle"
            size={20}
            color={styles.avatar.backgroundColor === "#4F7A3A" ? "#FFFFFF" : "#0F172A"}
            style={styles.avatarIcon}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const resolvedTitleColor = titleColor ?? styles.container.backgroundColor;
  const resolvedIconColor = iconColor;

  return (
    <View style={styles.container}>
      <Appbar.Header
        style={styles.header}
        statusBarHeight={0}
      >
        {/* Botón de retroceso */}
        {!useBreadcrumbTitle && canShowBack && (
          <Appbar.BackAction
            onPress={handleBack}
            iconColor={resolvedIconColor}
            size={20}
          />
        )}

        {/* Acciones del lado izquierdo */}
        {leftActions}

        {/* Título / breadcrumb */}
        {useBreadcrumbTitle ? (
          <View style={styles.titleSlot}>
            <WebBreadcrumb embedded showSingleItem />
          </View>
        ) : (
          <Appbar.Content
            title={title}
            subtitle={subtitle}
            titleStyle={[
              { color: resolvedTitleColor, fontSize: 18, fontWeight: "600" },
            ]}
            subtitleStyle={[
              { color: resolvedIconColor, opacity: 0.8, fontSize: 12 },
            ]}
          />
        )}

        {/* Search global (centro en desktop) */}
        {showSearchButton && isWeb && (
          <View style={styles.searchSlot}>
            <SearchInput
              placeholder="Buscar productos, clientes, pedidos..."
              onChangeText={onSearchPress}
            />
          </View>
        )}

        {/* Spacer flexible */}
        <View style={styles.spacer} />

       <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {/* Acciones del lado derecho */} {/* Botón de búsqueda (mobile: abre modal) */}
        {showSearchButton && !isWeb && (
          <Appbar.Action
            icon="magnify"
            onPress={handleSearch}
            iconColor={resolvedIconColor}
            size={20}
          />
        )}

        {/* Campana de notificaciones */}
        {showNotificationButton && <NotificationBell iconColor={resolvedIconColor} />}

        {/* User menu trigger */}
        {showProfileButton && (
          <UserMenu
            visible={userMenuVisible}
            onDismiss={() => setUserMenuVisible(false)}
            anchor={userMenuTrigger}
            onSwitchLocation={() => {
              router.push("/(stacks)/selectLocation" as any);
            }}
          />
        )}

        {/* Acciones del lado derecho */}
        {rightActions}
        </View>
      </Appbar.Header>
    </View>
  );
}

// Componentes auxiliares para acciones personalizadas
AppBar.Action = Appbar.Action;
AppBar.BackAction = Appbar.BackAction;
AppBar.Content = Appbar.Content;
