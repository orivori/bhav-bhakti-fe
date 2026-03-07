import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms';
import HindiText from '@/components/atoms/HindiText';
import MantraHeading from '@/components/atoms/MantraHeading';

/**
 * Test component to verify Hindi text rendering with matras
 * This helps debug matra visibility issues
 */
const HindiTextTest: React.FC = () => {
  const testWords = [
    'मंत्र', // mantra
    'रिंगटोन', // ringtone
    'मंत्ररिंगटोन', // mantra ringtone (compound word)
    'गणेश मंत्र', // Ganesh mantra
    'दैनिक स्थिति', // daily status
    'विघ्न हरण', // obstacle removal
    'समृद्धि', // prosperity
    'असमर्थ', // unable
    'लक्ष्मी मंत्र', // Lakshmi mantra
    'हनुमान मंत्र', // Hanuman mantra
    'शिव मंत्र', // Shiva mantra
    'दुर्गा मंत्र', // Durga mantra
    'सार्वभौमिक मंत्र', // universal mantras
    'आध्यात्मिक सामग्री', // spiritual content
  ];

  const problematicWords = [
    'मंत्ररिंगटोन', // The specific problematic compound word
    'दैनिकस्थिति', // Another compound
    'आध्यात्मिकसामग्री', // Longer compound
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="h3" weight="bold" style={styles.title}>
          Hindi Matra Fix Test
        </Text>

        <Text variant="body" style={styles.subtitle}>
          Platform: {Platform.OS}
        </Text>

        {/* Problematic Compound Words Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            🔧 Problematic Compound Words (Fixed)
          </Text>

          <Text variant="caption" style={styles.note}>
            Using MantraHeading component with ultra-generous spacing:
          </Text>

          {problematicWords.map((word, index) => (
            <View key={`problem-${index}`} style={styles.problemTestRow}>
              <MantraHeading variant="h3">
                {word}
              </MantraHeading>
            </View>
          ))}
        </View>

        {/* Heading Comparison Section */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            📝 Heading Sizes Comparison
          </Text>

          <Text variant="caption" style={styles.note}>
            Testing "मंत्ररिंगटोन" in different heading sizes:
          </Text>

          {(['h1', 'h2', 'h3', 'h4'] as const).map((variant) => (
            <View key={`heading-${variant}`} style={styles.testRow}>
              <Text variant="caption" style={styles.sizeLabel}>
                {variant.toUpperCase()}:
              </Text>
              <MantraHeading variant={variant}>
                मंत्ररिंगटोन
              </MantraHeading>
            </View>
          ))}
        </View>

        {/* Regular vs Enhanced Text */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            ⚖️ Regular vs Enhanced Text Component
          </Text>

          <View style={styles.comparisonRow}>
            <View style={styles.comparisonColumn}>
              <Text variant="caption" weight="bold" style={styles.columnTitle}>
                Enhanced Text Component:
              </Text>
              {testWords.slice(0, 5).map((word, index) => (
                <View key={`enhanced-${index}`} style={styles.testRow}>
                  <Text variant="h4" style={styles.testText}>
                    {word}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.comparisonColumn}>
              <Text variant="caption" weight="bold" style={styles.columnTitle}>
                Specialized Hindi Component:
              </Text>
              {testWords.slice(0, 5).map((word, index) => (
                <View key={`hindi-${index}`} style={styles.testRow}>
                  <HindiText fontSize={20} isHeading={true} style={styles.testText}>
                    {word}
                  </HindiText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* All Test Words */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            📚 All Test Words
          </Text>

          {testWords.map((word, index) => (
            <View key={`all-${index}`} style={styles.testRow}>
              <Text variant="body" style={styles.testText}>
                {word}
              </Text>
            </View>
          ))}
        </View>

        {/* Usage Instructions */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            💡 Usage Instructions
          </Text>

          <Text variant="body" style={styles.instruction}>
            • Use <Text weight="semibold">MantraHeading</Text> for problematic heading text like "मंत्ररिंगटोन"
          </Text>

          <Text variant="body" style={styles.instruction}>
            • Use <Text weight="semibold">HindiText</Text> with isHeading=true for other Hindi headings
          </Text>

          <Text variant="body" style={styles.instruction}>
            • Regular <Text weight="semibold">Text</Text> component now auto-detects Hindi and applies fixes
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#333',
  },
  note: {
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  testRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 4,
    borderRadius: 8,
  },
  problemTestRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e8', // Light green background for fixed problems
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  testText: {
    flex: 1,
  },
  sizeLabel: {
    width: 80,
    color: '#666',
    marginRight: 12,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  comparisonColumn: {
    flex: 1,
  },
  columnTitle: {
    marginBottom: 8,
    color: '#444',
  },
  instruction: {
    marginBottom: 8,
    paddingLeft: 12,
  },
});

export default HindiTextTest;
