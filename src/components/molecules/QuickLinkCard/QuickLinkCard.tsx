import React from 'react';
import { TouchableOpacity, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/atoms';
import { useTranslation as useI18n } from '@/shared/i18n/useTranslation';
import { QuickLinkCategory } from './categories';

// Confirmed shared gradient for every quick-link box - one treatment across
// Mantra/Rashifal/Status/Ringtone, not per-category.
const QUICK_LINK_GRADIENT = ['#E76A4A', '#FFA241'] as const;
// Icons render in solid black regardless of each source SVG's own baked-in
// color (see .svgrrc.json's replaceAttrValues for how that override reaches
// each file).
const ICON_COLOR = '#000000';

interface QuickLinkCardProps {
  category: QuickLinkCategory;
  onPress: () => void;
  iconSize?: number;
  containerStyle?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
}

const QuickLinkCard: React.FC<QuickLinkCardProps> = ({
  category,
  onPress,
  iconSize = 40,
  containerStyle,
  cardStyle,
}) => {
  const { currentLanguage } = useI18n();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;
  const { Icon } = category;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[styles.touchable, containerStyle]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <LinearGradient
          colors={QUICK_LINK_GRADIENT}
          style={[styles.card, cardStyle]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Icon width={iconSize} height={iconSize} fill={ICON_COLOR} />
          <Text variant="body" weight="semibold" style={styles.label}>
            {currentLanguage === 'hi' ? category.titleHi : category.titleEn}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  card: {
    height: 90,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#1E1E1E',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default QuickLinkCard;
