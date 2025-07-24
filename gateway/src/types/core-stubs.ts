/**
 * Temporary stub types for @mcp-tools/core services
 * These will be replaced with actual imports once the core library is built
 */

export interface KanbanService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getBoards(): Promise<any[]>;
  createBoard(args: any): Promise<any>;
  getBoard(id: number): Promise<any>;
  createCard(args: any): Promise<any>;
  updateCard(args: any): Promise<any>;
  moveCard(args: any): Promise<any>;
  deleteCard(id: number): Promise<boolean>;
}

export interface MemoryService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  retrieveMemory(args: any): Promise<any[]>;
  storeMemory(args: any): Promise<any>;
  searchMemories(args: any): Promise<any>;
  getRelatedMemories(args: any): Promise<any>;
  createConnection(args: any): Promise<any>;
  getMemoryStats(args: any): Promise<any>;
}

export interface ScraperService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  scrapeUrl(args: any): Promise<any>;
  getHealth(): Promise<any>;
}

export class KanbanServiceStub implements KanbanService {
  async initialize(): Promise<void> { console.log('KanbanService stub initialized'); }
  async shutdown(): Promise<void> { console.log('KanbanService stub shutdown'); }
  async getBoards(): Promise<any[]> { return []; }
  async createBoard(args: any): Promise<any> { return { id: 1, ...args }; }
  async getBoard(id: number): Promise<any> { return { id, name: 'Stub Board' }; }
  async createCard(args: any): Promise<any> { return { id: 1, ...args }; }
  async updateCard(args: any): Promise<any> { return { ...args }; }
  async moveCard(args: any): Promise<any> { return { ...args }; }
  async deleteCard(id: number): Promise<boolean> { return true; }
}

export class MemoryServiceStub implements MemoryService {
  async initialize(): Promise<void> { console.log('MemoryService stub initialized'); }
  async shutdown(): Promise<void> { console.log('MemoryService stub shutdown'); }
  async retrieveMemory(args: any): Promise<any[]> { return []; }
  async storeMemory(args: any): Promise<any> { return { id: 1, ...args }; }
  async searchMemories(args: any): Promise<any> { return { memories: [], relatedConcepts: [] }; }
  async getRelatedMemories(args: any): Promise<any> { return { center_memory: {}, related_nodes: [] }; }
  async createConnection(args: any): Promise<any> { return { id: 1, ...args }; }
  async getMemoryStats(args: any): Promise<any> { return { total_memories: 0 }; }
}

export class ScraperServiceStub implements ScraperService {
  async initialize(): Promise<void> { console.log('ScraperService stub initialized'); }
  async shutdown(): Promise<void> { console.log('ScraperService stub shutdown'); }
  async scrapeUrl(args: any): Promise<any> { return { content: 'Stub content', url: args.url }; }
  async getHealth(): Promise<any> { return { status: 'healthy' }; }
}