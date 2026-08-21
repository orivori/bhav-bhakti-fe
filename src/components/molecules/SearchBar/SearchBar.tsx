import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';

interface SearchBarProps {
  placeholder: string;
  onSearchSubmit: (query: string) => void;
  // Overrides the default marginHorizontal:spacing.lg gutter (matches
  // Home's own page edges) - callers embedding this inline next to other
  // header content (e.g. a back button) need that margin removed/replaced.
  containerStyle?: ViewStyle;
}

// Local state deliberately kept INSIDE this component (not lifted to the
// parent) - this is the "isolated" design originally built for Home
// (CLAUDE.md, index.tsx's former IsolatedSearchBar) specifically to avoid a
// real keyboard-dismiss bug that a lifted/controlled input reintroduces.
// Preserve this shape in every future caller.
const SearchBar: React.FC<SearchBarProps> = ({ placeholder, onSearchSubmit, containerStyle }) => {
  const [localSearchText, setLocalSearchText] = React.useState('');

  const handleSubmit = () => {
    onSearchSubmit(localSearchText.trim());
  };

  return (
    <View style={[styles.searchContainer, containerStyle]}>
      <Ionicons
        name="search-outline"
        size={20}
        color="#333333"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor="#8B7355"
        value={localSearchText}
        onChangeText={setLocalSearchText}
        returnKeyType="search"
        onSubmitEditing={handleSubmit}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor="#D4824A"
      />
      <TouchableOpacity style={styles.searchSubmitButton} onPress={handleSubmit}>
        <Ionicons
          name="search"
          size={18}
          color="#D4824A"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7ebc4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: goldenTempleTheme.spacing.lg,
    borderWidth: 1,
    borderColor: '#D4C4A8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontWeight: '400',
    padding: 0,
    margin: 0,
    height: 20,
  },
  searchSubmitButton: {
    marginLeft: 8,
    padding: 2,
  },
});

export default SearchBar;
