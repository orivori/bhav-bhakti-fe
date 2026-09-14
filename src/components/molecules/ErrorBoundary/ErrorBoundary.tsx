import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getCrashlytics, recordError } from '@react-native-firebase/crashlytics';
import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Root-level catch-all for unhandled render errors - React only gives a blank
// white screen otherwise (confirmed no boundary existed anywhere, §18/§93).
// Must be a class component; React has no hook equivalent for getDerivedStateFromError.
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    recordError(getCrashlytics(), error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text variant="h3" align="center" color="primary" style={styles.title}>
            Something went wrong
          </Text>
          <Text variant="body" align="center" color="muted">
            Please close and reopen the app.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: goldenTempleTheme.colors.background,
  },
  title: {
    marginBottom: 8,
  },
});
