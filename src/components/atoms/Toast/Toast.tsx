import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      // Show toast
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 300 });

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
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      if (onHide) {
        runOnJS(onHide)();
      }
    });
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      // Optional: Add haptic feedback here
    })
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -50 || event.velocityY < -500) {
        // Swipe up to dismiss
        runOnJS(hideToast)();
      } else {
        // Spring back to position
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

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
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: config.backgroundColor },
          animatedStyle,
        ]}
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
    </GestureDetector>
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
