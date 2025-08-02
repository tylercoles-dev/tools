/**
 * API Client for MCP Tools Backend
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { 
  MCPToolCall, 
  MCPResourceRequest,
  ApiResponse,
  ApiError
} from '@mcp-tools/core';

interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private retries: number;

  constructor(config: ApiClientConfig = {}) {
    this.retries = config.retries || 3;
    
    this.client = axios.create({
      baseURL: config.baseURL || process.env.API_BASE_URL || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth tokens
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const original = error.config;
        
        // Handle 401 unauthorized
        if (error.response?.status === 401 && original && !original.headers?.['X-Retry']) {
          // Try to refresh token
          try {
            await this.refreshToken();
            // Set retry header
            original.headers = {
              ...original.headers,
              'X-Retry': 'true',
            } as any;
            return this.client(original);
          } catch (refreshError) {
            // Redirect to login
            this.handleAuthError();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    // Get token from localStorage, cookies, or other storage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async refreshToken(): Promise<void> {
    // Implement token refresh logic
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/api/auth/refresh', {
      refreshToken,
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', newRefreshToken);
    }
  }

  private handleAuthError() {
    // Clear stored tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      
      // Redirect to login page
      window.location.href = '/auth/login';
    }
  }

  // Health endpoints
  async getHealth(): Promise<ApiResponse> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  async getDetailedHealth(): Promise<ApiResponse> {
    const response = await this.client.get('/api/health/detailed');
    return response.data;
  }

  // Authentication endpoints
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/login', {
      email,
      password,
    });
    
    const { accessToken, refreshToken } = response.data.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
    
    return response.data;
  }

  async signup(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<ApiResponse> {
    const response = await this.client.post('/api/auth/signup', userData);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      }
    }
  }

  // Kanban endpoints
  async getKanbanBoards(): Promise<ApiResponse> {
    const response = await this.client.get('/api/kanban/boards');
    return response.data;
  }

  async createKanbanBoard(board: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/kanban/boards', board);
    return response.data;
  }

  async getKanbanBoard(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/boards/${id}`);
    return response.data;
  }

  async updateKanbanBoard(id: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/boards/${id}`, updates);
    return response.data;
  }

  async deleteKanbanBoard(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/boards/${id}`);
    return response.data;
  }

  async createKanbanCard(card: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/kanban/cards', card);
    return response.data;
  }

  async updateKanbanCard(id: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/cards/${id}`, updates);
    return response.data;
  }

  async deleteKanbanCard(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/cards/${id}`);
    return response.data;
  }

  // Enhanced Kanban endpoints for new features

  // Custom Fields
  async createCustomField(boardId: string, field: any): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/boards/${boardId}/custom-fields`, field);
    return response.data;
  }

  async updateCustomField(fieldId: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/custom-fields/${fieldId}`, updates);
    return response.data;
  }

  async deleteCustomField(fieldId: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/custom-fields/${fieldId}`);
    return response.data;
  }

  async setCustomFieldValue(cardId: string, fieldId: string, value: any): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/cards/${cardId}/custom-fields/${fieldId}`, { value });
    return response.data;
  }

  async getCustomFieldValues(cardId: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/cards/${cardId}/custom-fields`);
    return response.data;
  }

  // Milestones
  async createMilestone(boardId: string, milestone: any): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/boards/${boardId}/milestones`, milestone);
    return response.data;
  }

  async updateMilestone(milestoneId: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/milestones/${milestoneId}`, updates);
    return response.data;
  }

  async deleteMilestone(milestoneId: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/milestones/${milestoneId}`);
    return response.data;
  }

  async completeMilestone(milestoneId: string, isCompleted: boolean): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/milestones/${milestoneId}/complete`, { 
      is_completed: isCompleted,
      completion_date: isCompleted ? new Date().toISOString().split('T')[0] : undefined
    });
    return response.data;
  }

  async assignCardToMilestone(cardId: string, milestoneId: string): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/cards/${cardId}/milestone`, { milestone_id: milestoneId });
    return response.data;
  }

  async getBoardMilestones(boardId: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/boards/${boardId}/milestones`);
    return response.data;
  }

  // Subtasks
  async createSubtask(cardId: string, subtask: any): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/cards/${cardId}/subtasks`, subtask);
    return response.data;
  }

  async updateSubtask(subtaskId: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/subtasks/${subtaskId}`, updates);
    return response.data;
  }

  async deleteSubtask(subtaskId: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/subtasks/${subtaskId}`);
    return response.data;
  }

  async completeSubtask(subtaskId: string, isCompleted: boolean): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/subtasks/${subtaskId}/complete`, { is_completed: isCompleted });
    return response.data;
  }

  async getCardSubtasks(cardId: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/cards/${cardId}/subtasks`);
    return response.data;
  }

  // Card Links
  async createCardLink(sourceCardId: string, targetCardId: string, linkType: string, description?: string): Promise<ApiResponse> {
    const response = await this.client.post('/api/kanban/card-links', {
      source_card_id: sourceCardId,
      target_card_id: targetCardId,
      link_type: linkType,
      description
    });
    return response.data;
  }

  async updateCardLink(linkId: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/card-links/${linkId}`, updates);
    return response.data;
  }

  async deleteCardLink(linkId: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/card-links/${linkId}`);
    return response.data;
  }

  async getCardLinks(cardId: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/cards/${cardId}/links`);
    return response.data;
  }

  // Time Tracking
  async createTimeEntry(cardId: string, timeEntry: any): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/cards/${cardId}/time-entries`, timeEntry);
    return response.data;
  }

  async updateTimeEntry(entryId: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/time-entries/${entryId}`, updates);
    return response.data;
  }

  async deleteTimeEntry(entryId: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/kanban/time-entries/${entryId}`);
    return response.data;
  }

  async startTimeTracking(cardId: string, description?: string): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/cards/${cardId}/time-tracking/start`, { 
      description,
      user_name: 'current_user' // This should come from auth context
    });
    return response.data;
  }

  async stopTimeTracking(entryId: string): Promise<ApiResponse> {
    const response = await this.client.post(`/api/kanban/time-entries/${entryId}/stop`);
    return response.data;
  }

  async updateCardTimeEstimate(cardId: string, estimatedHours: number): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/kanban/cards/${cardId}/time-estimate`, { 
      estimated_hours: estimatedHours 
    });
    return response.data;
  }

  async getCardTimeEntries(cardId: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/cards/${cardId}/time-entries`);
    return response.data;
  }

  async getActiveTimeTracking(): Promise<ApiResponse> {
    const response = await this.client.get('/api/kanban/time-tracking/active');
    return response.data;
  }

  async getTimeTrackingReport(boardId?: string, dateRange?: { from: string; to: string }): Promise<ApiResponse> {
    const params = { board_id: boardId, ...dateRange };
    const response = await this.client.get('/api/kanban/time-tracking/report', { params });
    return response.data;
  }

  // Analytics and Stats
  async getKanbanStats(boardId?: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/kanban/stats${boardId ? `?board_id=${boardId}` : ''}`);
    return response.data;
  }

  async searchCards(query: string, boardId?: string, filters?: any): Promise<ApiResponse> {
    const params = { query, board_id: boardId, ...filters };
    const response = await this.client.get('/api/kanban/cards/search', { params });
    return response.data;
  }

  // Memory endpoints
  async getMemories(params?: any): Promise<ApiResponse> {
    const response = await this.client.get('/api/memory/memories', { params });
    return response.data;
  }

  async createMemory(memory: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/memory/memories', memory);
    return response.data;
  }

  async getMemory(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/memory/memories/${id}`);
    return response.data;
  }

  async updateMemory(id: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/memory/memories/${id}`, updates);
    return response.data;
  }

  async deleteMemory(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/memory/memories/${id}`);
    return response.data;
  }

  async searchMemories(query: string, filters?: any): Promise<ApiResponse> {
    const response = await this.client.get('/api/memory/search', {
      params: { query, ...filters },
    });
    return response.data;
  }

  // Wiki endpoints
  async getWikiPages(params?: any): Promise<ApiResponse> {
    const response = await this.client.get('/api/wiki/pages', { params });
    return response.data;
  }

  async createWikiPage(page: any): Promise<ApiResponse> {
    const response = await this.client.post('/api/wiki/pages', page);
    return response.data;
  }

  async getWikiPage(id: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/wiki/pages/${id}`);
    return response.data;
  }

  async updateWikiPage(id: string, updates: any): Promise<ApiResponse> {
    const response = await this.client.patch(`/api/wiki/pages/${id}`, updates);
    return response.data;
  }

  async deleteWikiPage(id: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/api/wiki/pages/${id}`);
    return response.data;
  }

  // MCP Tool calls
  async callMCPTool(server: string, tool: MCPToolCall): Promise<ApiResponse> {
    const response = await this.client.post(`/api/mcp/${server}/tools/call`, tool);
    return response.data;
  }

  async getMCPResource(server: string, resource: MCPResourceRequest): Promise<ApiResponse> {
    const response = await this.client.post(`/api/mcp/${server}/resources/read`, resource);
    return response.data;
  }

  async listMCPTools(server: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/mcp/${server}/tools`);
    return response.data;
  }

  async listMCPResources(server: string): Promise<ApiResponse> {
    const response = await this.client.get(`/api/mcp/${server}/resources`);
    return response.data;
  }

  // Generic HTTP methods for flexibility
  async get(url: string, config?: any): Promise<AxiosResponse> {
    return this.client.get(url, config);
  }

  async post(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: any): Promise<AxiosResponse> {
    return this.client.patch(url, data, config);
  }

  async delete(url: string, config?: any): Promise<AxiosResponse> {
    return this.client.delete(url, config);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();