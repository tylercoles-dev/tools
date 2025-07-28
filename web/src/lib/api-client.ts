/**
 * API Client for MCP Tools Backend
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { 
  MCPToolCall, 
  MCPResourceRequest,
  ApiResponse,
  ApiError
} from '@mcp-tools/core/shared';

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