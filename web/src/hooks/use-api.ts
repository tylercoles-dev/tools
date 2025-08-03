/**
 * React Query hooks for API calls
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

// Query keys for consistent caching
export const queryKeys = {
  health: ['health'] as const,
  auth: {
    user: ['auth', 'user'] as const,
  },
  kanban: {
    all: ['kanban'] as const,
    boards: () => [...queryKeys.kanban.all, 'boards'] as const,
    board: (id: string) => [...queryKeys.kanban.all, 'board', id] as const,
    cards: (boardId: string) => [...queryKeys.kanban.all, 'cards', boardId] as const,
  },
  memory: {
    all: ['memory'] as const,
    memories: (params?: any) => [...queryKeys.memory.all, 'memories', params] as const,
    memory: (id: string) => [...queryKeys.memory.all, 'memory', id] as const,
    search: (query: string, filters?: any) => [...queryKeys.memory.all, 'search', query, filters] as const,
  },
  wiki: {
    all: ['wiki'] as const,
    pages: (params?: any) => [...queryKeys.wiki.all, 'pages', params] as const,
    page: (id: string) => [...queryKeys.wiki.all, 'page', id] as const,
  },
} as const;

// Health hooks
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiClient.getHealth(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Authentication hooks
export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
      toast({
        title: 'Welcome back!',
        description: 'You have been successfully logged in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error?.response?.data?.message || 'Invalid credentials',
        variant: 'destructive',
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: (userData: { email: string; password: string; name: string }) =>
      apiClient.signup(userData),
    onSuccess: () => {
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Signup failed',
        description: error?.response?.data?.message || 'Failed to create account',
        variant: 'destructive',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    },
  });

  return {
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isSigningUp: signupMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}

// Kanban hooks
export function useKanbanBoards() {
  return useQuery({
    queryKey: queryKeys.kanban.boards(),
    queryFn: () => apiClient.getKanbanBoards(),
  });
}

export function useKanbanBoard(id: string) {
  return useQuery({
    queryKey: queryKeys.kanban.board(id),
    queryFn: () => apiClient.getKanbanBoard(id),
    enabled: !!id,
  });
}

// Enhanced Kanban data hooks
export function useBoardMilestones(boardId: string) {
  return useQuery({
    queryKey: [...queryKeys.kanban.board(boardId), 'milestones'],
    queryFn: () => apiClient.getBoardMilestones(boardId),
    enabled: !!boardId,
  });
}

export function useCardSubtasks(cardId: string) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'card', cardId, 'subtasks'],
    queryFn: () => apiClient.getCardSubtasks(cardId),
    enabled: !!cardId,
  });
}

export function useCardLinks(cardId: string) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'card', cardId, 'links'],
    queryFn: () => apiClient.getCardLinks(cardId),
    enabled: !!cardId,
  });
}

export function useCardTimeEntries(cardId: string) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'card', cardId, 'time-entries'],
    queryFn: () => apiClient.getCardTimeEntries(cardId),
    enabled: !!cardId,
  });
}

export function useCardCustomFields(cardId: string) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'card', cardId, 'custom-fields'],
    queryFn: () => apiClient.getCustomFieldValues(cardId),
    enabled: !!cardId,
  });
}

export function useActiveTimeTracking() {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'active-time-tracking'],
    queryFn: () => apiClient.getActiveTimeTracking(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useTimeTrackingReport(boardId?: string, dateRange?: { from: string; to: string }) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'time-tracking-report', boardId, dateRange],
    queryFn: () => apiClient.getTimeTrackingReport(boardId, dateRange),
    enabled: !!boardId || !!dateRange,
  });
}

export function useKanbanStats(boardId?: string) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'stats', boardId],
    queryFn: () => apiClient.getKanbanStats(boardId),
  });
}

export function useCardSearch(query: string, boardId?: string, filters?: any) {
  return useQuery({
    queryKey: [...queryKeys.kanban.all, 'search', query, boardId, filters],
    queryFn: () => apiClient.searchCards(query, boardId, filters),
    enabled: !!query.trim(),
  });
}

export function useKanbanMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createBoard = useMutation({
    mutationFn: (board: any) => apiClient.createKanbanBoard(board),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.boards() });
      toast({
        title: 'Board created',
        description: 'Your new kanban board has been created successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to create board',
        description: 'There was an error creating your board. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateBoard = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateKanbanBoard(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.boards() });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: (id: string) => apiClient.deleteKanbanBoard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.boards() });
      toast({
        title: 'Board deleted',
        description: 'The board has been deleted successfully.',
      });
    },
  });

  const createCard = useMutation({
    mutationFn: (card: any) => apiClient.createKanbanCard(card),
    onSuccess: (_, card) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(card.boardId) });
    },
  });

  const updateCard = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateKanbanCard(id, updates),
    onSuccess: (_, { updates }) => {
      if (updates.boardId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(updates.boardId) });
      }
    },
  });

  const deleteCard = useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      apiClient.deleteKanbanCard(id),
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(boardId) });
    },
  });

  // Custom Fields mutations
  const createCustomField = useMutation({
    mutationFn: ({ boardId, field }: { boardId: string; field: any }) =>
      apiClient.createCustomField(boardId, field),
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(boardId) });
      toast({
        title: 'Custom field created',
        description: 'Your custom field has been added to the board.',
      });
    },
  });

  const updateCustomField = useMutation({
    mutationFn: ({ fieldId, updates }: { fieldId: string; updates: any }) =>
      apiClient.updateCustomField(fieldId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const deleteCustomField = useMutation({
    mutationFn: (fieldId: string) => apiClient.deleteCustomField(fieldId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
      toast({
        title: 'Custom field deleted',
        description: 'The custom field has been removed.',
      });
    },
  });

  const setCustomFieldValue = useMutation({
    mutationFn: ({ cardId, fieldId, value }: { cardId: string; fieldId: string; value: any }) =>
      apiClient.setCustomFieldValue(cardId, fieldId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  // Milestone mutations
  const createMilestone = useMutation({
    mutationFn: ({ boardId, milestone }: { boardId: string; milestone: any }) =>
      apiClient.createMilestone(boardId, milestone),
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.board(boardId) });
      toast({
        title: 'Milestone created',
        description: 'Your milestone has been created successfully.',
      });
    },
  });

  const updateMilestone = useMutation({
    mutationFn: ({ milestoneId, updates }: { milestoneId: string; updates: any }) =>
      apiClient.updateMilestone(milestoneId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: (milestoneId: string) => apiClient.deleteMilestone(milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
      toast({
        title: 'Milestone deleted',
        description: 'The milestone has been deleted.',
      });
    },
  });

  const completeMilestone = useMutation({
    mutationFn: ({ milestoneId, isCompleted }: { milestoneId: string; isCompleted: boolean }) =>
      apiClient.completeMilestone(milestoneId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const assignCardToMilestone = useMutation({
    mutationFn: ({ cardId, milestoneId }: { cardId: string; milestoneId: string }) =>
      apiClient.assignCardToMilestone(cardId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  // Subtask mutations
  const createSubtask = useMutation({
    mutationFn: ({ cardId, subtask }: { cardId: string; subtask: any }) =>
      apiClient.createSubtask(cardId, subtask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const updateSubtask = useMutation({
    mutationFn: ({ subtaskId, updates }: { subtaskId: string; updates: any }) =>
      apiClient.updateSubtask(subtaskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const deleteSubtask = useMutation({
    mutationFn: (subtaskId: string) => apiClient.deleteSubtask(subtaskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const completeSubtask = useMutation({
    mutationFn: ({ subtaskId, isCompleted }: { subtaskId: string; isCompleted: boolean }) =>
      apiClient.completeSubtask(subtaskId, isCompleted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  // Card Link mutations
  const createCardLink = useMutation({
    mutationFn: ({ sourceCardId, targetCardId, linkType, description }: { 
      sourceCardId: string; 
      targetCardId: string; 
      linkType: string; 
      description?: string; 
    }) => apiClient.createCardLink(sourceCardId, targetCardId, linkType, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
      toast({
        title: 'Card link created',
        description: 'The cards have been linked successfully.',
      });
    },
  });

  const updateCardLink = useMutation({
    mutationFn: ({ linkId, updates }: { linkId: string; updates: any }) =>
      apiClient.updateCardLink(linkId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const deleteCardLink = useMutation({
    mutationFn: (linkId: string) => apiClient.deleteCardLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
      toast({
        title: 'Card link removed',
        description: 'The link between cards has been removed.',
      });
    },
  });

  // Time Tracking mutations
  const createTimeEntry = useMutation({
    mutationFn: ({ cardId, timeEntry }: { cardId: string; timeEntry: any }) =>
      apiClient.createTimeEntry(cardId, timeEntry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const updateTimeEntry = useMutation({
    mutationFn: ({ entryId, updates }: { entryId: string; updates: any }) =>
      apiClient.updateTimeEntry(entryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const deleteTimeEntry = useMutation({
    mutationFn: (entryId: string) => apiClient.deleteTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  const startTimeTracking = useMutation({
    mutationFn: ({ cardId, description }: { cardId: string; description?: string }) =>
      apiClient.startTimeTracking(cardId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
      toast({
        title: 'Time tracking started',
        description: 'Your time is now being tracked for this card.',
      });
    },
  });

  const stopTimeTracking = useMutation({
    mutationFn: (entryId: string) => apiClient.stopTimeTracking(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
      toast({
        title: 'Time tracking stopped',
        description: 'Your time entry has been saved.',
      });
    },
  });

  const updateCardTimeEstimate = useMutation({
    mutationFn: ({ cardId, estimatedHours }: { cardId: string; estimatedHours: number }) =>
      apiClient.updateCardTimeEstimate(cardId, estimatedHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanban.all });
    },
  });

  return {
    createBoard,
    updateBoard,
    deleteBoard,
    createCard,
    updateCard,
    deleteCard,
    // Custom Fields
    createCustomField,
    updateCustomField,
    deleteCustomField,
    setCustomFieldValue,
    // Milestones
    createMilestone,
    updateMilestone,
    deleteMilestone,
    completeMilestone,
    assignCardToMilestone,
    // Subtasks
    createSubtask,
    updateSubtask,
    deleteSubtask,
    completeSubtask,
    // Card Links
    createCardLink,
    updateCardLink,
    deleteCardLink,
    // Time Tracking
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    startTimeTracking,
    stopTimeTracking,
    updateCardTimeEstimate,
  };
}

// Memory hooks
export function useMemories(params?: any) {
  return useQuery({
    queryKey: queryKeys.memory.memories(params),
    queryFn: () => apiClient.getMemories(params),
  });
}

export function useMemory(id: string) {
  return useQuery({
    queryKey: queryKeys.memory.memory(id),
    queryFn: () => apiClient.getMemory(id),
    enabled: !!id,
  });
}

export function useMemorySearch(query: string, filters?: any) {
  return useQuery({
    queryKey: queryKeys.memory.search(query, filters),
    queryFn: () => apiClient.searchMemories(query, filters),
    enabled: !!query.trim(),
  });
}

export function useMemoryMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMemory = useMutation({
    mutationFn: (memory: any) => apiClient.createMemory(memory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      toast({
        title: 'Memory created',
        description: 'Your memory has been saved successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to create memory',
        description: 'There was an error saving your memory. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateMemory = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateMemory(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.memory(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
    },
  });

  const deleteMemory = useMutation({
    mutationFn: (id: string) => apiClient.deleteMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      toast({
        title: 'Memory deleted',
        description: 'The memory has been deleted successfully.',
      });
    },
  });

  return {
    createMemory,
    updateMemory,
    deleteMemory,
  };
}

// Wiki hooks
export function useWikiPages(params?: any) {
  return useQuery({
    queryKey: queryKeys.wiki.pages(params),
    queryFn: () => apiClient.getWikiPages(params),
  });
}

export function useWikiPage(id: string) {
  return useQuery({
    queryKey: queryKeys.wiki.page(id),
    queryFn: () => apiClient.getWikiPage(id),
    enabled: !!id,
  });
}

export function useWikiMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPage = useMutation({
    mutationFn: (page: any) => apiClient.createWikiPage(page),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wiki.all });
      toast({
        title: 'Page created',
        description: 'Your wiki page has been created successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to create page',
        description: 'There was an error creating your page. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updatePage = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateWikiPage(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wiki.page(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wiki.all });
    },
  });

  const deletePage = useMutation({
    mutationFn: (id: string) => apiClient.deleteWikiPage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.wiki.all });
      toast({
        title: 'Page deleted',
        description: 'The page has been deleted successfully.',
      });
    },
  });

  return {
    createPage,
    updatePage,
    deletePage,
  };
}

// General useApi hook that components are trying to import
export function useApi() {
  return {
    kanban: {
      useBoards: useKanbanBoards,
      useBoard: useKanbanBoard,
      useMutations: useKanbanMutations,
      useStats: useKanbanStats,
      useSearch: useCardSearch,
    },
    memory: {
      useMemories,
      useMemory,
      useSearch: useMemorySearch,
      useMutations: useMemoryMutations,
    },
    wiki: {
      usePages: useWikiPages,
      usePage: useWikiPage,
      useMutations: useWikiMutations,
    },
    auth: {
      useAuth,
    },
    health: {
      useHealth,
    },
  };
}