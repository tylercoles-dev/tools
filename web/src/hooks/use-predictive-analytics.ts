import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types (from gateway)
interface TaskCompletionPrediction {
  taskId?: string;
  estimatedCompletion: string;
  confidence: number;
  factors: {
    historicalAverage: number;
    currentPace: number;
    complexity: number;
    timeOfDay: number;
    dayOfWeek: number;
  };
  recommendations: string[];
}

interface ProductivityForecast {
  timeRange: {
    start: string;
    end: string;
  };
  predictions: {
    tasksCompleted: number;
    productivityScore: number;
    peakHours: number[];
    lowEnergyPeriods: number[];
    optimalWorkload: number;
  };
  confidence: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  seasonalFactors: {
    dayOfWeek: number;
    timeOfMonth: number;
    historicalPattern: string;
  };
}

interface WorkloadCapacityPrediction {
  currentCapacity: number;
  optimalCapacity: number;
  burnoutRisk: number;
  recommendations: {
    suggestedTaskLimit: number;
    breakFrequency: number;
    focusTimeBlocks: Array<{ start: number; end: number }>;
    energyOptimization: string[];
  };
  nextWeekForecast: {
    expectedLoad: number;
    suggestedAdjustments: string[];
  };
}

interface ComprehensivePredictions {
  taskCompletion: TaskCompletionPrediction;
  productivityForecast: ProductivityForecast;
  workloadCapacity: WorkloadCapacityPrediction;
}

/**
 * Hook for task completion predictions
 */
export function useTaskCompletionPrediction(taskId?: string, complexity?: number) {

  return useQuery({
    queryKey: ['taskCompletionPrediction', taskId, complexity],
    queryFn: async () => {
      const endpoint = taskId 
        ? `/api/v1/analytics/predictions/tasks/${taskId}`
        : '/api/v1/analytics/predictions/tasks';
      
      const params = complexity ? { complexity: complexity.toString() } : {};
      
      const response = await apiClient.get(endpoint, { params });
      return response.data.data as TaskCompletionPrediction;
    },
    enabled: !!apiClient,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook for productivity forecasting
 */
export function useProductivityForecast(days: number = 7) {

  return useQuery({
    queryKey: ['productivityForecast', days],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/analytics/predictions/productivity', {
        params: { days: days.toString() }
      });
      return response.data.data as ProductivityForecast;
    },
    enabled: !!apiClient,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for workload capacity predictions
 */
export function useWorkloadCapacityPrediction() {

  return useQuery({
    queryKey: ['workloadCapacityPrediction'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/analytics/predictions/workload');
      return response.data.data as WorkloadCapacityPrediction;
    },
    enabled: !!apiClient,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook for comprehensive predictions (all types)
 */
export function useComprehensivePredictions() {

  return useQuery({
    queryKey: ['comprehensivePredictions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/analytics/predictions/comprehensive');
      return response.data.data as ComprehensivePredictions;
    },
    enabled: !!apiClient,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook for training predictive models
 */
export function useTrainPredictiveModels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/analytics/models/train');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all prediction queries to refresh with updated models
      queryClient.invalidateQueries({ queryKey: ['taskCompletionPrediction'] });
      queryClient.invalidateQueries({ queryKey: ['productivityForecast'] });
      queryClient.invalidateQueries({ queryKey: ['workloadCapacityPrediction'] });
      queryClient.invalidateQueries({ queryKey: ['comprehensivePredictions'] });
    },
  });
}

/**
 * Hook for predictive analytics dashboard data
 */
export function usePredictiveAnalyticsDashboard() {
  const taskPrediction = useTaskCompletionPrediction();
  const productivityForecast = useProductivityForecast(7);
  const workloadCapacity = useWorkloadCapacityPrediction();
  const trainModels = useTrainPredictiveModels();

  const isLoading = taskPrediction.isLoading || 
                   productivityForecast.isLoading || 
                   workloadCapacity.isLoading;

  const hasError = taskPrediction.error || 
                   productivityForecast.error || 
                   workloadCapacity.error;

  const refetchAll = () => {
    taskPrediction.refetch();
    productivityForecast.refetch();
    workloadCapacity.refetch();
  };

  return {
    // Individual predictions
    taskPrediction: taskPrediction.data,
    productivityForecast: productivityForecast.data,
    workloadCapacity: workloadCapacity.data,
    
    // Loading states
    isLoading,
    isTaskPredictionLoading: taskPrediction.isLoading,
    isProductivityForecastLoading: productivityForecast.isLoading,
    isWorkloadCapacityLoading: workloadCapacity.isLoading,
    
    // Error states
    hasError,
    taskPredictionError: taskPrediction.error,
    productivityForecastError: productivityForecast.error,
    workloadCapacityError: workloadCapacity.error,
    
    // Actions
    refetchAll,
    trainModels: trainModels.mutate,
    isTraining: trainModels.isPending,
    trainError: trainModels.error,
    
    // Convenience computed values
    hasHighBurnoutRisk: workloadCapacity.data?.burnoutRisk && workloadCapacity.data.burnoutRisk > 0.7,
    isProductivityImproving: productivityForecast.data?.trendDirection === 'improving',
    hasLowConfidence: (
      (taskPrediction.data?.confidence || 0) < 0.6 ||
      (productivityForecast.data?.confidence || 0) < 0.6
    ),
    
    // Summary insights
    topRecommendations: [
      ...(taskPrediction.data?.recommendations || []),
      ...(workloadCapacity.data?.recommendations.energyOptimization || []),
      ...(workloadCapacity.data?.nextWeekForecast.suggestedAdjustments || [])
    ].slice(0, 3),
    
    nextPeakHour: productivityForecast.data?.predictions.peakHours?.[0],
    suggestedBreakFrequency: workloadCapacity.data?.recommendations.breakFrequency,
    expectedTasksThisWeek: productivityForecast.data?.predictions.tasksCompleted
  };
}

/**
 * Hook for real-time prediction updates
 */
export function usePredictiveAnalyticsUpdates() {
  const queryClient = useQueryClient();
  
  const refreshPredictions = () => {
    queryClient.invalidateQueries({ queryKey: ['taskCompletionPrediction'] });
    queryClient.invalidateQueries({ queryKey: ['productivityForecast'] });
    queryClient.invalidateQueries({ queryKey: ['workloadCapacityPrediction'] });
    queryClient.invalidateQueries({ queryKey: ['comprehensivePredictions'] });
  };

  return {
    refreshPredictions
  };
}

export default usePredictiveAnalyticsDashboard;