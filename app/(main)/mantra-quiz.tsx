import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/atoms';
import { goldenTempleTheme } from '@/styles/goldenTempleTheme';
import { useTranslation } from '@/hooks/useTranslation';
import { useQuiz } from '@/features/quiz/hooks/useQuiz';

export default function MantraQuizScreen() {
  const { language } = useTranslation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});

  const { data: quiz, isLoading, error } = useQuiz('mantra_recommendation');

  // Set initial selected option when navigating back
  useEffect(() => {
    if (quiz && quiz.questions) {
      const currentAnswer = answers[currentQuestionIndex + 1];
      setSelectedOption(currentAnswer ? currentAnswer.optionId : null);
    }
  }, [currentQuestionIndex, answers, quiz]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff6b35" />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !quiz) {
    Alert.alert('Error', 'Failed to load quiz. Please try again.');
    router.back();
    return null;
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = Math.round(((currentQuestionIndex + 1) / quiz.totalQuestions) * 100);

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Restore previous selection
      const prevAnswer = answers[currentQuestionIndex];
      setSelectedOption(prevAnswer ? prevAnswer.optionId : null);
    } else {
      router.back();
    }
  };

  const handleOptionSelect = (option: any) => {
    setSelectedOption(option.id);

    // Save answer
    const newAnswers = {
      ...answers,
      [currentQuestionIndex + 1]: {
        questionId: currentQuestion.id,
        optionId: option.id,
        optionValue: option.optionValue,
        optionText: option.optionText
      }
    };
    setAnswers(newAnswers);

    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (currentQuestionIndex < quiz.totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption(null);
      } else {
        // Quiz completed - show results or navigate to results
        handleQuizComplete(newAnswers);
      }
    }, 500);
  };

  const handleQuizComplete = (finalAnswers: Record<number, any>) => {
    console.log('Quiz completed with answers:', finalAnswers);

    Alert.alert(
      'Quiz Completed!',
      'Thank you for completing the quiz. Your personalized mantra recommendations are being prepared.',
      [
        {
          text: 'View Mantras',
          onPress: () => router.replace('/(main)/mantras')
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color="#666" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {quiz.totalQuestions}
          </Text>
          <Text style={styles.progressPercentage}>{progress}%</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="star-outline" size={32} color="#ff6b35" />
          </View>

          <Text style={styles.questionTitle}>
            {currentQuestion.questionText[language as keyof typeof currentQuestion.questionText] ||
             currentQuestion.questionText.en}
          </Text>

          <Text style={styles.questionSubtitle}>
            {currentQuestion.questionSubtext[language as keyof typeof currentQuestion.questionSubtext] ||
             currentQuestion.questionSubtext.en}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedOption === option.id && styles.optionCardSelected
              ]}
              onPress={() => handleOptionSelect(option)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.optionText,
                selectedOption === option.id && styles.optionTextSelected
              ]}>
                {option.optionText[language as keyof typeof option.optionText] || option.optionText.en}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={selectedOption === option.id ? "#ff6b35" : "#999"}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7', // Cream background like in image
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: goldenTempleTheme.spacing.md,
    fontSize: 16,
    color: goldenTempleTheme.colors.text.secondary,
  },
  header: {
    paddingHorizontal: goldenTempleTheme.spacing.md,
    paddingVertical: goldenTempleTheme.spacing.md,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: goldenTempleTheme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  backText: {
    marginLeft: goldenTempleTheme.spacing.xs,
    color: '#666',
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: goldenTempleTheme.spacing.sm,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b35',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff6b35',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: goldenTempleTheme.spacing.md,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: goldenTempleTheme.spacing.lg,
    marginBottom: goldenTempleTheme.spacing.lg,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#ff6b35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: goldenTempleTheme.spacing.md,
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: goldenTempleTheme.spacing.sm,
    lineHeight: 28,
  },
  questionSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  optionsContainer: {
    gap: goldenTempleTheme.spacing.sm,
    paddingBottom: goldenTempleTheme.spacing.xl,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: goldenTempleTheme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#ff6b35',
    fontWeight: '600',
  },
});