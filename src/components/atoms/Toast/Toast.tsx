import React from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface ToastProps {
  type?: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  duration?: number;
  onHide?: () => void;
  visible: boolean;
}

const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  duration = 3000,
  onHide,
  visible,
}) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
          stiffness: 150,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) {
        onHide();
      }
    });
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 10;
        },
        onPanResponderGrant: () => {
          // Optional: Add haptic feedback here
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy < 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy < -50 || gestureState.vy < -0.5) {
            // Swipe up to dismiss
            hideToast();
          } else {
            // Spring back to position
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [hideToast]
  );

  const animatedStyle = {
    transform: [{ translateY }],
    opacity,
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          icon: 'checkmark-circle',
          iconColor: '#ffffff',
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          icon: 'close-circle',
          iconColor: '#ffffff',
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          icon: 'warning',
          iconColor: '#ffffff',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#3B82F6',
          icon: 'information-circle',
          iconColor: '#ffffff',
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
        animatedStyle,
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.content}>
        <Ionicons
          name={config.icon as any}
          size={24}
          color={config.iconColor}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          {title && (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.95,
  },
});

export default Toast;
