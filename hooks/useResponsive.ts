import { useEffect, useState } from "react";
import { Dimensions } from "react-native";

interface BreakpointConfig {
  xs: number; // Mobile
  sm: number; // Small tablet
  md: number; // Medium tablet
  lg: number; // Large tablet
  xl: number; // Desktop
}

interface ResponsiveConfig {
  columns: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  gap: number;
  padding: number;
}

const defaultBreakpoints: BreakpointConfig = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

const defaultConfig: ResponsiveConfig = {
  columns: {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
  },
  gap: 12,
  padding: 16,
};

export function useResponsive(config: Partial<ResponsiveConfig> = {}) {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  const finalConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const getCurrentBreakpoint = () => {
    const { width } = dimensions;

    if (width >= defaultBreakpoints.xl) return "xl";
    if (width >= defaultBreakpoints.lg) return "lg";
    if (width >= defaultBreakpoints.md) return "md";
    if (width >= defaultBreakpoints.sm) return "sm";
    return "xs";
  };

  const currentBreakpoint = getCurrentBreakpoint();
  const columns = finalConfig.columns[currentBreakpoint];

  const getItemWidth = (containerWidth: number) => {
    const totalGaps = finalConfig.gap * (columns - 1);
    const totalPadding = finalConfig.padding * 2;
    const availableWidth = containerWidth - totalGaps - totalPadding;

    return Math.floor(availableWidth / columns);
  };

  const getGridStyles = (containerWidth: number) => ({
    container: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: finalConfig.gap,
      paddingHorizontal: finalConfig.padding,
    },
    item: {
      width: getItemWidth(containerWidth),
      flexBasis: getItemWidth(containerWidth),
    },
  });

  return {
    dimensions,
    currentBreakpoint,
    columns,
    gap: finalConfig.gap,
    padding: finalConfig.padding,
    getItemWidth,
    getGridStyles,
    isMobile: currentBreakpoint === "xs" || currentBreakpoint === "sm",
    isXs: currentBreakpoint === "xs",
    isSm: currentBreakpoint === "sm",
    isMd: currentBreakpoint === "md",
    isLg: currentBreakpoint === "lg",
    isXl: currentBreakpoint === "xl",
  };
}
