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

  return {
    createBoard,
    updateBoard,
    deleteBoard,
    createCard,
    updateCard,
    deleteCard,
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