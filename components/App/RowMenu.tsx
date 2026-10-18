import { useTheme } from "@/contexts/ThemeContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { IconButton } from "react-native-paper";
import Menu from "./AppMenu";

export interface RowMenuAction {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  /** En rojo (eliminar, cancelar). */
  destructive?: boolean;
}

/**
 * Menú "⋮" de una fila, como el de los listados (AppList): las acciones
 * secundarias quedan a un toque sin ocupar lugar en cada renglón.
 */
export default function RowMenu({
  actions,
  accessibilityLabel = "Más acciones",
}: {
  actions: RowMenuAction[];
  accessibilityLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  const { colors } = useTheme();

  if (actions.length === 0) return null;

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <IconButton
          icon="dots-vertical"
          size={18}
          iconColor={colors.textMuted}
          onPress={() => setVisible(true)}
          accessibilityLabel={accessibilityLabel}
          style={{ margin: -6 }}
        />
      }
      contentStyle={{ backgroundColor: colors.surface }}
    >
      {actions.map((action) => (
        <Menu.Item
          key={action.label}
          leadingIcon={action.icon}
          title={action.label}
          titleStyle={{ color: action.destructive ? colors.error : colors.text }}
          onPress={() => {
            setVisible(false);
            action.onPress();
          }}
        />
      ))}
    </Menu>
  );
}
