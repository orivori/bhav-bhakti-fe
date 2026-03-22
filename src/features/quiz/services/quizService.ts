import { apiClient } from '@/shared/services/apiClient';
import { API_ENDPOINTS } from '@/shared/config/api';

export interface QuizOption {
  id: number;
  optionText: {
    en: string;
    hi: string;
  };
  optionValue: string;
  optionOrder: number;
}

export interface QuizQuestion {
  id: number;
  questionText: {
    en: string;
    hi: string;
  };
  questionSubtext: {
    en: string;
    hi: string;
  };
  questionType: string;
  questionOrder: number;
  options: QuizOption[];
}

export interface Quiz {
  id: number;
  title: {
    en: string;
    hi: string;
  };
  description: {
    en: string;
    hi: string;
  };
  totalQuestions: number;
  questions: QuizQuestion[];
}

export interface QuizSession {
  sessionId: string;
  quiz: {
    id: number;
    title: {
      en: string;
      hi: string;
    };
    description: {
      en: string;
      hi: string;
    };
    totalQuestions: number;
  };
  currentQuestion: QuizQuestion;
  questionNumber: number;
  progress: number;
}

export interface QuizAnswer {
  sessionId: string;
  questionNumber: number;
  optionId: number;
}

export interface QuizResults {
  sessionId: string;
  quiz: Quiz;
  answers: Record<string, any>;
  recommendations: {
    primaryCategory: any;
    secondaryCategories: any[];
    recommendedMantras: any[];
    personalizedMessage: {
      en: string;
      hi: string;
    };
    practiceSchedule: {
      timeOfDay: string;
      duration: string;
      frequency: string;
    };
  };
  completedAt: string;
}

class QuizService {
  /**
   * Get quiz by type
   */
  async getQuiz(type: string = 'mantra_recommendation'): Promise<Quiz> {
    const response = await apiClient.get<{ data: Quiz }>(API_ENDPOINTS.QUIZ.GET_QUIZ(type));
    return response.data;
  }

  /**
   * Start a new quiz session
   */
  async startQuiz(type: string = 'mantra_recommendation'): Promise<QuizSession> {
    const response = await apiClient.post<{ data: QuizSession }>(API_ENDPOINTS.QUIZ.START(type), {});
    return response.data;
  }

  /**
   * Get specific question by number
   */
  async getQuestion(sessionId: string, questionNumber: number): Promise<{
    question: QuizQuestion;
    questionNumber: number;
    totalQuestions: number;
    progress: number;
    sessionId: string;
  }> {
    const response = await apiClient.get<{ data: any }>(API_ENDPOINTS.QUIZ.GET_QUESTION(sessionId, questionNumber));
    return response.data;
  }

  /**
   * Submit answer for a question
   */
  async submitAnswer(answer: QuizAnswer): Promise<{
    sessionId: string;
    questionNumber: number;
    isLastQuestion: boolean;
    nextQuestionNumber: number | null;
    progress: number;
    completed?: boolean;
    recommendations?: any;
    nextQuestion?: QuizQuestion;
  }> {
    const response = await apiClient.post<{ data: any }>(API_ENDPOINTS.QUIZ.SUBMIT_ANSWER, answer);
    return response.data;
  }

  /**
   * Get quiz results
   */
  async getResults(sessionId: string): Promise<QuizResults> {
    const response = await apiClient.get<{ data: QuizResults }>(API_ENDPOINTS.QUIZ.GET_RESULTS(sessionId));
    return response.data;
  }

  /**
   * Get user's quiz history
   */
  async getHistory(type: string = 'mantra_recommendation'): Promise<QuizResults[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('type', type);
    const response = await apiClient.get<{ data: QuizResults[] }>(`${API_ENDPOINTS.QUIZ.HISTORY}?${queryParams.toString()}`);
    return response.data;
  }
}

export const quizService = new QuizService();
