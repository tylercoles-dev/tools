# Backend Integration Layer Design

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [MCP Server Details](MCP_SERVER_DETAILS.md) | [TypeScript Workers](WORKERS_ARCHITECTURE.md)

## Qdrant Vector Database Integration

🔗 **Related**: [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md) | [API Specifications](API_SPECIFICATIONS.md)

### Collection Design

```typescript
// src/vector/collections.ts
export interface QdrantCollectionConfig {
  name: string;
  vector_size: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
  on_disk_payload: boolean;
  hnsw_config: {
    m: number;
    ef_construct: number;
    full_scan_threshold: number;
  };
}

export const COLLECTIONS: Record<string, QdrantCollectionConfig> = {
  kanban_tasks: {
    name: 'kanban_tasks',
    vector_size: 1536, // OpenAI ada-002 embedding size
    distance: 'Cosine',
    on_disk_payload: true,
    hnsw_config: {
      m: 16,
      ef_construct: 100,
      full_scan_threshold: 10000
    }
  },
  
  wiki_pages: {
    name: 'wiki_pages', 
    vector_size: 1536,
    distance: 'Cosine',
    on_disk_payload: true,
    hnsw_config: {
      m: 16,
      ef_construct: 100,
      full_scan_threshold: 10000
    }
  },
  
  memory_nodes: {
    name: 'memory_nodes',
    vector_size: 1536,
    distance: 'Cosine',
    on_disk_payload: true,
    hnsw_config: {
      m: 16,
      ef_construct: 100, 
      full_scan_threshold: 10000
    }
  },
  
  cross_references: {
    name: 'cross_references',
    vector_size: 1536,
    distance: 'Cosine',
    on_disk_payload: true,
    hnsw_config: {
      m: 16,
      ef_construct: 100,
      full_scan_threshold: 10000
    }
  }
};
```

### Vector Service Implementation

```typescript
// src/vector/service.ts
export class VectorService {
  private client: QdrantClient;
  
  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: `http://${config.host}:${config.port}`,
      apiKey: config.apiKey
    });
  }
  
  async initialize(): Promise<void> {
    for (const [name, config] of Object.entries(COLLECTIONS)) {
      const exists = await this.collectionExists(name);
      if (!exists) {
        await this.createCollection(config);
      }
    }
  }
  
  async upsertPoint(
    collection: string,
    point: VectorPoint
  ): Promise<void> {
    await this.client.upsert(collection, {
      wait: true,
      points: [point]
    });
  }
  
  async search(
    collection: string,
    query: VectorSearchQuery
  ): Promise<VectorSearchResult[]> {
    const response = await this.client.search(collection, {
      vector: query.vector,
      limit: query.limit || 10,
      score_threshold: query.threshold || 0.7,
      filter: query.filter ? this.buildFilter(query.filter) : undefined,
      with_payload: true,
      with_vector: false
    });
    
    return response.map(r => ({
      id: r.id.toString(),
      score: r.score,
      payload: r.payload
    }));
  }
  
  async hybridSearch(
    collections: string[],
    query: HybridSearchQuery
  ): Promise<HybridSearchResult[]> {
    const searches = collections.map(collection => 
      this.search(collection, {
        vector: query.vector,
        limit: query.limit,
        threshold: query.threshold,
        filter: query.filters?.[collection]
      })
    );
    
    const results = await Promise.all(searches);
    return this.mergeAndRankResults(results, collections);
  }
  
  private buildFilter(filter: SearchFilter): any {
    const conditions: any[] = [];
    
    if (filter.must) {
      conditions.push({
        must: filter.must.map(f => this.buildCondition(f))
      });
    }
    
    if (filter.should) {
      conditions.push({
        should: filter.should.map(f => this.buildCondition(f))
      });
    }
    
    return conditions.length === 1 ? conditions[0] : { must: conditions };
  }
  
  private buildCondition(condition: FilterCondition): any {
    switch (condition.type) {
      case 'match':
        return {
          key: condition.field,
          match: { value: condition.value }
        };
      case 'range':
        return {
          key: condition.field,
          range: condition.range
        };
      case 'geo':
        return {
          key: condition.field,
          geo_radius: condition.geo
        };
      default:
        throw new Error(`Unsupported filter type: ${condition.type}`);
    }
  }
}
```

### Embedding Service

```typescript
// src/embeddings/service.ts
export class EmbeddingService {
  private openaiClient: OpenAI;
  private cache: Map<string, number[]> = new Map();
  
  constructor(private config: EmbeddingConfig) {
    this.openaiClient = new OpenAI({
      apiKey: config.openaiApiKey
    });
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = this.hashText(text);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const response = await this.openaiClient.embeddings.create({
      model: 'text-embedding-ada-002',
      input: this.preprocessText(text)
    });
    
    const embedding = response.data[0].embedding;
    this.cache.set(cacheKey, embedding);
    
    return embedding;
  }
  
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const uncachedTexts: string[] = [];
    const results: (number[] | null)[] = texts.map(text => {
      const cacheKey = this.hashText(text);
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }
      uncachedTexts.push(text);
      return null;
    });
    
    if (uncachedTexts.length > 0) {
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-ada-002',
        input: uncachedTexts.map(t => this.preprocessText(t))
      });
      
      let uncachedIndex = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i] === null) {
          const embedding = response.data[uncachedIndex].embedding;
          results[i] = embedding;
          
          const cacheKey = this.hashText(texts[i]);
          this.cache.set(cacheKey, embedding);
          uncachedIndex++;
        }
      }
    }
    
    return results as number[][];
  }
  
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 8000); // Token limit safety
  }
  
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
```

## Integration Layer Architecture

📊 **Data Flows**: [Cross-Server Search Flow](DATA_FLOW_DIAGRAMS.md#2-cross-server-search-flow)

### API Gateway Design

```typescript
// src/gateway/server.ts
export class APIGateway {
  private app: Express;
  private io: SocketIOServer;
  
  constructor(
    private mcpClients: MCPClientManager,
    private vectorService: VectorService,
    private cache: CacheService
  ) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  private setupRoutes(): void {
    // Cross-server search
    this.app.get('/api/search', async (req, res) => {
      const { q, type, limit = 10 } = req.query;
      
      try {
        const results = await this.performCrossServerSearch(
          q as string,
          type as string,
          parseInt(limit as string)
        );
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Unified insights
    this.app.get('/api/insights', async (req, res) => {
      const { userId } = req.query;
      
      try {
        const insights = await this.generateInsights(userId as string);
        res.json(insights);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Proxy routes to MCP servers
    this.app.use('/api/kanban', this.proxyToMCP('kanban'));
    this.app.use('/api/wiki', this.proxyToMCP('wiki'));  
    this.app.use('/api/memory', this.proxyToMCP('memory'));
  }
  
  private async performCrossServerSearch(
    query: string,
    type: string,
    limit: number
  ): Promise<CrossServerSearchResult[]> {
    const embedding = await this.vectorService.generateEmbedding(query);
    
    const collections = type === 'all' 
      ? ['kanban_tasks', 'wiki_pages', 'memory_nodes']
      : [type];
    
    const results = await this.vectorService.hybridSearch(collections, {
      vector: embedding,
      limit,
      threshold: 0.6
    });
    
    // Enrich results with full data from respective services
    return await this.enrichSearchResults(results);
  }
  
  private async generateInsights(userId: string): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    // Task completion patterns
    const taskInsights = await this.analyzeTasks(userId);
    insights.push(...taskInsights);
    
    // Knowledge gaps
    const knowledgeInsights = await this.analyzeKnowledge(userId);
    insights.push(...knowledgeInsights);
    
    // Memory connections
    const memoryInsights = await this.analyzeMemories(userId);
    insights.push(...memoryInsights);
    
    return insights.sort((a, b) => b.priority - a.priority);
  }
}
```

### Cache Service

```typescript
// src/cache/service.ts
export class CacheService {
  private redis: Redis;
  
  constructor(config: RedisConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.database
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (ttl) {
      await this.redis.setex(key, ttl, serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }
  
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
  
  // Cache strategies
  async cacheSearchResults(
    query: string,
    results: any[],
    ttl: number = 300
  ): Promise<void> {
    const key = `search:${this.hashQuery(query)}`;
    await this.set(key, results, ttl);
  }
  
  async getCachedSearchResults(query: string): Promise<any[] | null> {
    const key = `search:${this.hashQuery(query)}`;
    return await this.get(key);
  }
  
  private hashQuery(query: string): string {
    return crypto.createHash('sha256').update(query).digest('hex');
  }
}
```

## NATS Message Broker Integration

📦 **Workers Implementation**: [TypeScript Workers Architecture](WORKERS_ARCHITECTURE.md)

### Message Schemas

```typescript
// src/messaging/schemas.ts
export interface BaseMessage {
  messageId: string;
  timestamp: Date;
  source: string;
  version: string;
}

export interface TaskCreatedMessage extends BaseMessage {
  type: 'task.created';
  data: {
    taskId: string;
    boardId: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    assigneeId?: string;
    tags: string[];
  };
}

export interface PageUpdatedMessage extends BaseMessage {
  type: 'page.updated';
  data: {
    pageId: string;
    title: string;
    content: string;
    category: string;
    authorId: string;
    tags: string[];
    previousVersion: string;
  };
}

export interface MemoryStoredMessage extends BaseMessage {
  type: 'memory.stored';
  data: {
    memoryId: string;
    content: string;
    context: Record<string, any>;
    concepts: string[];
    authorId: string;
  };
}

export interface VectorIndexRequest extends BaseMessage {
  type: 'vector.index.request';
  data: {
    entityId: string;
    entityType: 'task' | 'page' | 'memory';
    content: string;
    metadata: Record<string, any>;
  };
}

export interface RelationshipAnalysisRequest extends BaseMessage {
  type: 'relationship.analyze.request';
  data: {
    entityId: string;
    entityType: 'task' | 'page' | 'memory';
    content: string;
    context: Record<string, any>;
  };
}
```

### Message Bus Service

```typescript
// src/messaging/service.ts
export class MessageBusService {
  private nc: NatsConnection;
  private js: JetStreamManager;
  
  constructor(private config: NatsConfig) {}
  
  async initialize(): Promise<void> {
    this.nc = await connect({
      servers: this.config.servers,
      credentials: this.config.credentials
    });
    
    this.js = this.nc.jetstream();
    await this.setupStreams();
  }
  
  async publish<T extends BaseMessage>(
    subject: string,
    message: T
  ): Promise<void> {
    const enrichedMessage = {
      ...message,
      messageId: crypto.randomUUID(),
      timestamp: new Date(),
      version: '1.0'
    };
    
    await this.js.publish(subject, JSON.stringify(enrichedMessage));
  }
  
  async subscribe<T extends BaseMessage>(
    subject: string,
    handler: (message: T) => Promise<void>,
    options: SubscriptionOptions = {}
  ): Promise<void> {
    const subscription = await this.js.subscribe(subject, {
      durable: options.durableName,
      queue: options.queueGroup,
      manual_ack: true
    });
    
    for await (const msg of subscription) {
      try {
        const message = JSON.parse(msg.data.toString()) as T;
        await handler(message);
        msg.ack();
      } catch (error) {
        console.error('Message processing error:', error);
        msg.nak();
      }
    }
  }
  
  private async setupStreams(): Promise<void> {
    const streams = [
      {
        name: 'MCP_EVENTS',
        subjects: ['mcp.>'],
        retention: RetentionPolicy.WorkQueue,
        storage: StorageType.File
      },
      {
        name: 'VECTOR_PROCESSING',
        subjects: ['vector.>'],
        retention: RetentionPolicy.WorkQueue,
        storage: StorageType.File
      }
    ];
    
    for (const stream of streams) {
      try {
        await this.js.streams.add(stream);
      } catch (error) {
        if (error.message.includes('already exists')) {
          continue;
        }
        throw error;
      }
    }
  }
}
```

## Database Integration Layer

### Database Connection Pool

```typescript
// src/database/connection.ts
export class DatabaseManager {
  private pools: Map<string, Pool> = new Map();
  
  constructor(private configs: Record<string, DatabaseConfig>) {}
  
  async initialize(): Promise<void> {
    for (const [name, config] of Object.entries(this.configs)) {
      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        max: config.maxConnections || 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });
      
      this.pools.set(name, pool);
    }
  }
  
  getPool(name: string = 'default'): Pool {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Database pool '${name}' not found`);
    }
    return pool;
  }
  
  async withTransaction<T>(
    poolName: string = 'default',
    fn: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = this.getPool(poolName);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### Migration System

```typescript
// src/database/migrations.ts
export class MigrationRunner {
  constructor(private db: DatabaseManager) {}
  
  async runMigrations(): Promise<void> {
    await this.ensureMigrationTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = await this.getAvailableMigrations();
    
    const pendingMigrations = availableMigrations.filter(
      m => !appliedMigrations.includes(m.name)
    );
    
    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
  }
  
  private async runMigration(migration: Migration): Promise<void> {
    console.log(`Running migration: ${migration.name}`);
    
    await this.db.withTransaction(async (client) => {
      await client.query(migration.up);
      await client.query(
        'INSERT INTO schema_migrations (name, applied_at) VALUES ($1, $2)',
        [migration.name, new Date()]
      );
    });
    
    console.log(`Completed migration: ${migration.name}`);
  }
}
```

This backend integration layer provides a robust foundation for connecting all the MCP servers with shared infrastructure services like Qdrant, NATS, PostgreSQL, and Redis while maintaining clean separation of concerns and scalability.

## Next Steps

- 📦 **Background Processing**: [TypeScript Workers Architecture](WORKERS_ARCHITECTURE.md)
- ⚛️ **Frontend Integration**: [Web Client Architecture](WEB_CLIENT_ARCHITECTURE.md)
- 📊 **System Workflows**: [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)
- 🔌 **API Implementation**: [API Specifications](API_SPECIFICATIONS.md)