import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface GoldenSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  style?: ViewStyle;
}

const GoldenSearchBar: React.FC<GoldenSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onSearch,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={goldenTempleTheme.gradients.temple}
        style={styles.borderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.inputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={goldenTempleTheme.colors.accent.DEFAULT}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={goldenTempleTheme.colors.text.muted}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => onChangeText('')}
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={goldenTempleTheme.colors.text.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: goldenTempleTheme.spacing.md,
    marginVertical: goldenTempleTheme.spacing.sm,
  },
  borderGradient: {
    borderRadius: goldenTempleTheme.borderRadius.xl,
    padding: 2, // Border thickness
    ...goldenTempleTheme.shadows.md,
  },
  inputContainer: {
    backgroundColor: goldenTempleTheme.colors.backgrounds.card,
    borderRadius: goldenTempleTheme.borderRadius.xl - 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.sm,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: goldenTempleTheme.spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.primary,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
  },
});

export default GoldenSearchBar;