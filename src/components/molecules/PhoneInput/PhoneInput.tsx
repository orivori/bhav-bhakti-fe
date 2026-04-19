import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, ViewStyle, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Sample country data - in a real app, you'd import this from a library
const COUNTRIES = [
   { code: 'IN', name: 'India', callingCode: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', callingCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', callingCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', callingCode: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', callingCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', callingCode: '+81', flag: '🇯🇵' },
  { code: 'CN', name: 'China', callingCode: '+86', flag: '🇨🇳' },
  { code: 'BR', name: 'Brazil', callingCode: '+55', flag: '🇧🇷' },
];

interface PhoneInputProps {
  value: string;
  onChangeText: (phoneNumber: string) => void;
  onCountryChange: (country: { code: string; callingCode: string }) => void;
  selectedCountry?: { code: string; callingCode: string };
  error?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  onCountryChange,
  selectedCountry = { code: 'US', callingCode: '+1' },
  error,
  label = 'Phone Number',
  placeholder = 'Enter your phone number',
  disabled = false,
  style,
}) => {
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);

  const selectedCountryData = COUNTRIES.find(
    country => country.code === selectedCountry.code
  ) || COUNTRIES[0];

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    onCountryChange({
      code: country.code,
      callingCode: country.callingCode,
    });
    setIsCountryPickerVisible(false);
  };

  const CountryPicker = () => (
    <TouchableOpacity
      style={[styles.countryPicker, disabled && styles.countryPickerDisabled]}
      onPress={() => !disabled && setIsCountryPickerVisible(true)}
      disabled={disabled}
    >
      <Text style={styles.flag}>{selectedCountryData.flag}</Text>
      <Text style={styles.callingCode}>
        {selectedCountryData.callingCode}
      </Text>
      <Ionicons name="chevron-down" size={16} color="#6b7280" />
    </TouchableOpacity>
  );

  const inputWrapperStyle = [
    styles.inputWrapper,
    error && styles.inputWrapperError,
    disabled && styles.inputWrapperDisabled,
  ];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}

      <View style={inputWrapperStyle}>
        <CountryPicker />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          editable={!disabled}
        />
      </View>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      <Modal
        visible={isCountryPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select Country
            </Text>
            <TouchableOpacity
              onPress={() => setIsCountryPickerVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={COUNTRIES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => handleCountrySelect(item)}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryName}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryCode}>
                    {item.callingCode}
                  </Text>
                </View>
                {selectedCountryData.code === item.code && (
                  <Ionicons name="checkmark" size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#FEF6DA',
    overflow: 'hidden',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputWrapperDisabled: {
    backgroundColor: '#f3f4f6',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  countryPickerDisabled: {
    opacity: 0.5,
  },
  flag: {
    fontSize: 24,
    marginRight: 8,
  },
  callingCode: {
    color: '#111827',
    fontWeight: '500',
    marginRight: 4,
    fontSize: 16,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  countryCode: {
    color: '#6b7280',
    fontSize: 14,
  },
});

export default PhoneInput;
