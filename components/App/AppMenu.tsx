import React, { useEffect, useState } from "react";
import { Menu, type MenuProps } from "react-native-paper";

/**
 * Menu de Paper que no se monta hasta que se abre por primera vez.
 *
 * En web, Paper 5.15 llama a su hide() en el primer render (con
 * visible=false) y al terminar enfoca el ancla: cada pantalla con un ⋮ o con
 * la lada del teléfono se abría con un anillo de foco en ese botón, y le
 * quitaba el foco a lo que lo tuviera. Mientras no se haya abierto, aquí se
 * pinta solo el ancla.
 */
function AppMenu(props: MenuProps) {
  const [mounted, setMounted] = useState(props.visible);

  useEffect(() => {
    if (props.visible) setMounted(true);
  }, [props.visible]);

  if (!mounted) {
    // El ancla también puede ser una posición ({ x, y }): no se pinta.
    return React.isValidElement(props.anchor) ? props.anchor : null;
  }
  return <Menu {...props} />;
}

AppMenu.Item = Menu.Item;

export default AppMenu;
