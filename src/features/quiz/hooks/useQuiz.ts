import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizService, Quiz, QuizSession, QuizAnswer, QuizResults } from '../services/quizService';

export function useQuiz(type: string = 'mantra_recommendation', enabled: boolean = true) {
  return useQuery<Quiz, Error>({
    queryKey: ['quiz', type],
    queryFn: () => quizService.getQuiz(type),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useStartQuiz() {
  const queryClient = useQueryClient();

  return useMutation<QuizSession, Error, string>({
    mutationFn: (type: string = 'mantra_recommendation') => quizService.startQuiz(type),
    onSuccess: (data) => {
      // Cache the quiz session
      queryClient.setQueryData(['quizSession', data.sessionId], data);
    },
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, QuizAnswer>({
    mutationFn: (answer: QuizAnswer) => quizService.submitAnswer(answer),
    onSuccess: (data, variables) => {
      // Update the session cache if needed
      if (data.completed) {
        // Quiz is completed, we can cache the results
        queryClient.setQueryData(['quizResults', variables.sessionId], data.recommendations);
      }
    },
  });
}

export function useQuizResults(sessionId: string, enabled: boolean = true) {
  return useQuery<QuizResults, Error>({
    queryKey: ['quizResults', sessionId],
    queryFn: () => quizService.getResults(sessionId),
    enabled: enabled && !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useQuizHistory(type: string = 'mantra_recommendation', enabled: boolean = true) {
  return useQuery<QuizResults[], Error>({
    queryKey: ['quizHistory', type],
    queryFn: () => quizService.getHistory(type),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}
