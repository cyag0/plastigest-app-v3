import palette from "@/constants/palette";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI */
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches unhandled render errors in the component tree.
 * Wrap sections of the UI that may throw during render.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log error for debugging; replace with a remote error tracker if needed
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={64}
            color={palette.red}
          />
          <Text variant="titleLarge" style={styles.title}>
            Algo salió mal
          </Text>
          <Text variant="bodyMedium" style={styles.message}>
            Ocurrió un error inesperado. Por favor intenta de nuevo.
          </Text>
          {__DEV__ && this.state.error && (
            <Text variant="bodySmall" style={styles.devError}>
              {this.state.error.message}
            </Text>
          )}
          <Button
            mode="contained"
            onPress={this.handleRetry}
            buttonColor={palette.primary}
            style={styles.button}
          >
            Reintentar
          </Button>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: palette.surface,
    gap: 12,
  },
  title: {
    fontWeight: "bold",
    color: palette.text,
    textAlign: "center",
  },
  message: {
    color: palette.textSecondary,
    textAlign: "center",
  },
  devError: {
    color: palette.red,
    textAlign: "center",
    fontFamily: "monospace",
    marginTop: 4,
  },
  button: {
    marginTop: 8,
    minWidth: 160,
  },
});
