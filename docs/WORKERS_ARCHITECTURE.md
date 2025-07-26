# TypeScript Workers Architecture

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [Shared Types Architecture](SHARED_TYPES_ARCHITECTURE.md) | [Backend Integration](BACKEND_INTEGRATION.md)

## Overview

The MCP Tools system uses TypeScript-based background workers for asynchronous processing tasks including vector embedding generation, memory analysis, and document processing. These workers are built with modern TypeScript patterns, shared type safety, and integrate seamlessly with NATS message broker for reliable distributed processing.

## Architecture Principles

### 1. **Type Safety First**
All workers use shared types from `@mcp-tools/core/shared` for consistent interfaces and compile-time safety.

### 2. **Message-Driven Design**
Workers communicate exclusively through NATS messages, enabling horizontal scaling and fault tolerance.

### 3. **Provider Abstraction**
Pluggable provider system allows switching between different service implementations (Ollama, OpenAI, etc.).

### 4. **Graceful Error Handling**
Comprehensive error handling with retries, circuit breakers, and detailed logging.

### 5. **Health & Monitoring**
Built-in health checks, metrics collection, and performance monitoring.

## Current Workers

### 1. Embeddings Worker

📁 **Location**: `workers/embeddings/`  
🎯 **Purpose**: Generate vector embeddings for semantic search  
🔗 **Providers**: Ollama, OpenAI  

#### Architecture

```typescript
// workers/embeddings/src/worker.ts
export class EmbeddingsWorker {
  private natsConnection?: NatsConnection;
  private embeddingProvider: EmbeddingProvider;
  private logger: Logger;
  private config: EmbeddingsWorkerConfig;
  private stats: EmbeddingsWorkerStats;

  constructor(config: EmbeddingsWorkerConfig) {
    this.config = config;
    this.embeddingProvider = createEmbeddingProvider(config);
    this.setupLogging();
  }

  async start(): Promise<void> {
    await this.connectToNATS();
    await this.testEmbeddingProvider();
    await this.setupMessageHandlers();
  }

  private async setupMessageHandlers(): Promise<void> {
    // Single embedding requests
    await this.natsConnection!.subscribe('embeddings.request', {
      callback: this.handleEmbeddingRequest.bind(this)
    });

    // Batch embedding requests
    await this.natsConnection!.subscribe('embeddings.batch', {
      callback: this.handleBatchRequest.bind(this)
    });

    // Statistics requests
    await this.natsConnection!.subscribe('embeddings.stats', {
      callback: this.handleStatsRequest.bind(this)
    });
  }
}
```

#### Provider System

```typescript
// workers/embeddings/src/providers/base.ts
export abstract class BaseEmbeddingProvider implements EmbeddingProvider {
  protected cache = new Map<string, number[]>();
  
  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract generateEmbeddingsBatch(texts: string[]): Promise<number[][]>;
  
  getDimension(): number;
  getModelName(): string;
  getCacheStats(): { size: number; maxSize: number };
}

// workers/embeddings/src/providers/ollama.ts
export class OllamaEmbeddingProvider extends BaseEmbeddingProvider {
  constructor(baseUrl: string, modelName: string) {
    super();
    this.baseUrl = baseUrl;
    this.modelName = modelName;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cached = await this.getCachedEmbedding(text);
    if (cached) return cached;

    // Generate via Ollama API
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.modelName, prompt: text })
    });

    const data = await response.json();
    const embedding = data.embedding;
    
    // Cache result
    this.setCachedEmbedding(text, embedding);
    return embedding;
  }
}

// workers/embeddings/src/providers/openai.ts  
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private client: OpenAI;
  
  constructor(apiKey: string, modelName: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.modelName = modelName;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: text,
      encoding_format: 'float'
    });

    return response.data[0].embedding;
  }
}
```

#### Message Handling

```typescript
// Handle single embedding request
private async handleEmbeddingRequest(msg: any): Promise<void> {
  const request = this.jsonCodec.decode(msg.data) as EmbeddingRequest;
  
  try {
    const embedding = await this.embeddingProvider.generateEmbedding(request.text);
    
    const response: EmbeddingResponse = {
      request_id: request.request_id,
      embedding,
      dimension: this.embeddingProvider.getDimension(),
      processing_time_ms: Date.now() - startTime
    };
    
    msg.respond(this.jsonCodec.encode(response));
    this.stats.successfulEmbeddings++;
  } catch (error) {
    this.handleEmbeddingError(error, msg, request.request_id);
  }
}

// Handle batch embedding requests
private async handleBatchRequest(msg: any): Promise<void> {
  const request = this.jsonCodec.decode(msg.data) as EmbeddingBatchRequest;
  
  const texts = request.requests.map(r => r.text);
  const embeddings = await this.embeddingProvider.generateEmbeddingsBatch(texts);
  
  const responses: EmbeddingResponse[] = request.requests.map((req, i) => ({
    request_id: req.request_id,
    embedding: embeddings[i],
    dimension: this.embeddingProvider.getDimension(),
    processing_time_ms: processingTimeMs / request.requests.length
  }));

  const batchResponse: EmbeddingBatchResponse = {
    batch_id: request.batch_id,
    responses,
    errors: [],
    total_processing_time_ms: processingTimeMs,
    completed_at: Date.now()
  };

  msg.respond(this.jsonCodec.encode(batchResponse));
}
```

#### Configuration

```typescript
// workers/embeddings/src/config.ts
export function loadConfig(): EmbeddingsWorkerConfig {
  return EmbeddingsWorkerConfigSchema.parse({
    // Base worker config
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    workerName: 'embeddings-worker',
    logLevel: process.env.LOG_LEVEL || 'info',
    maxConcurrency: parseInt(process.env.MAX_CONCURRENCY || '10'),

    // Embedding-specific config  
    embeddingProvider: process.env.EMBEDDING_PROVIDER || 'ollama',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'nomic-embed-text:latest',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'text-embedding-3-small',
    batchSize: parseInt(process.env.BATCH_SIZE || '32'),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3')
  });
}
```

#### Deployment

```dockerfile
# workers/embeddings/Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env* ./

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 2. Memory Processing Service

📁 **Location**: `core/src/services/memory-processing/`  
🎯 **Purpose**: Analyze content and detect relationships  
🔗 **Integration**: Part of core library, used by memory services  

#### Architecture

```typescript
// core/src/services/memory-processing/service.ts
export class MemoryProcessingService {
  private contentAnalyzer: ContentAnalyzer;
  private relationshipDetector: RelationshipDetector;
  private jsonCodec = JSONCodec();

  constructor(
    private config: MemoryProcessingConfig,
    private deps: MemoryProcessingDependencies
  ) {
    this.contentAnalyzer = new ContentAnalyzer(config.analysis);
    this.relationshipDetector = new RelationshipDetector(config.relationships);
  }

  async processMemory(memory: MemoryProcessingEvent): Promise<ProcessedMemoryEvent> {
    // Analyze content (sentiment, topics, keywords, entities)
    const analysis = await this.contentAnalyzer.analyzeContent(
      memory.content, 
      memory.metadata
    );

    // Generate embedding for semantic search
    const embedding = await this.requestEmbedding(memory.content);

    // Detect relationships with existing memories
    const relationships = await this.relationshipDetector.detectRelationships(
      memory,
      analysis,
      embedding
    );

    // Create processed result
    const processedMemory: ProcessedMemoryEvent = {
      ...memory,
      analysis,
      embedding,
      relationships,
      processed_at: Date.now(),
      processing_time_ms: Date.now() - memory.created_at
    };

    // Publish events for downstream services
    await this.publishProcessedMemory(processedMemory);
    
    return processedMemory;
  }

  private async requestEmbedding(text: string): Promise<number[]> {
    const request: EmbeddingRequest = {
      id: `memory-processing-${Date.now()}`,
      text,
      request_id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    const response = await this.deps.natsConnection.request(
      this.config.embeddingsWorkerSubject,
      this.jsonCodec.encode(request),
      { timeout: 30000 }
    );

    const embeddingResponse = this.jsonCodec.decode(response.data) as EmbeddingResponse;
    return embeddingResponse.embedding;
  }
}
```

#### Content Analysis

```typescript
// core/src/services/memory-processing/analysis/content-analyzer.ts
export class ContentAnalyzer {
  constructor(private config: ContentAnalysisConfig) {}

  async analyzeContent(content: string, metadata?: any): Promise<ContentAnalysis> {
    return {
      // Sentiment analysis (positive/negative/neutral)
      sentiment: await this.analyzeSentiment(content),
      
      // Topic extraction and classification  
      topics: await this.extractTopics(content),
      
      // Keyword extraction with importance scoring
      keywords: await this.extractKeywords(content),
      
      // Named entity recognition (people, places, organizations)
      entities: await this.extractEntities(content),
      
      // Content statistics
      stats: {
        word_count: content.split(/\s+/).length,
        character_count: content.length,
        sentence_count: content.split(/[.!?]+/).length,
        reading_time: Math.ceil(content.split(/\s+/).length / 200) // words per minute
      }
    };
  }

  private async analyzeSentiment(content: string): Promise<SentimentAnalysis> {
    // Basic sentiment analysis using lexicon-based approach
    // Could be enhanced with ML models
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing'];
    
    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    const score = (positiveCount - negativeCount) / words.length;
    
    return {
      score, // -1 to 1 range
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      confidence: Math.abs(score)
    };
  }
}
```

#### Relationship Detection

```typescript
// core/src/services/memory-processing/relationships/detector.ts
export class RelationshipDetector {
  constructor(private config: RelationshipConfig) {}

  async detectRelationships(
    memory: MemoryProcessingEvent,
    analysis: ContentAnalysis,
    embedding: number[]
  ): Promise<MemoryRelationship[]> {
    const relationships: MemoryRelationship[] = [];

    // 1. Semantic similarity via embedding comparison
    const semanticRelationships = await this.detectSemanticSimilarity(
      memory, embedding, this.config.semanticThreshold
    );
    relationships.push(...semanticRelationships);

    // 2. Topic overlap analysis
    const topicRelationships = await this.detectTopicOverlap(
      memory, analysis.topics, this.config.topicThreshold
    );
    relationships.push(...topicRelationships);

    // 3. Keyword/tag similarity
    const tagRelationships = await this.detectTagSimilarity(
      memory, analysis.keywords, this.config.tagThreshold
    );
    relationships.push(...tagRelationships);

    // 4. Temporal proximity (memories created around same time)
    const temporalRelationships = await this.detectTemporalProximity(
      memory, this.config.temporalWindowMs
    );
    relationships.push(...temporalRelationships);

    return relationships;
  }

  private async detectSemanticSimilarity(
    memory: MemoryProcessingEvent,
    embedding: number[],
    threshold: number
  ): Promise<MemoryRelationship[]> {
    // Query vector database for similar embeddings
    const similarMemories = await this.querySimilarMemories(embedding, threshold);
    
    return similarMemories.map(similar => ({
      id: `${memory.id}-${similar.id}`,
      source_id: memory.id,
      target_id: similar.id,
      type: 'semantic_similarity',
      strength: similar.similarity_score,
      metadata: {
        similarity_score: similar.similarity_score,
        algorithm: 'cosine_similarity'
      },
      created_at: Date.now()
    }));
  }
}
```

### 3. Markitdown Worker

📁 **Location**: `workers/markitdown/`  
🎯 **Purpose**: Document conversion and processing  
🔗 **Integration**: Converts various document formats to markdown  

#### Architecture

```typescript
// workers/markitdown/src/worker.ts
export class MarkitdownWorker {
  private converters = new Map<string, DocumentConverter>();

  constructor(private config: MarkitdownWorkerConfig) {
    this.setupConverters();
  }

  private setupConverters(): void {
    this.converters.set('.pdf', new PDFConverter());
    this.converters.set('.docx', new DocxConverter());
    this.converters.set('.html', new HTMLConverter());
    this.converters.set('.xlsx', new ExcelConverter());
    this.converters.set('.pptx', new PowerPointConverter());
  }

  async processDocument(request: DocumentConversionRequest): Promise<DocumentConversionResponse> {
    const fileExtension = this.getFileExtension(request.filename);
    const converter = this.converters.get(fileExtension);
    
    if (!converter) {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }

    const markdown = await converter.convert(request.content, request.options);
    
    return {
      request_id: request.request_id,
      markdown,
      metadata: {
        original_filename: request.filename,
        file_type: fileExtension,
        conversion_time_ms: Date.now() - request.timestamp,
        word_count: markdown.split(/\s+/).length
      }
    };
  }
}
```

## Deployment Architecture

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Message Broker
  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"
    command: ["--js", "--sd", "/data"]
    volumes:
      - nats_data:/data

  # Embeddings Worker
  embeddings-worker:
    build: ./workers/embeddings
    environment:
      NATS_URL: nats://nats:4222
      EMBEDDING_PROVIDER: ollama
      OLLAMA_BASE_URL: http://ollama:11434
      LOG_LEVEL: info
    depends_on:
      - nats
      - ollama
    deploy:
      replicas: 2

  # Ollama Service
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_models:/root/.ollama
    environment:
      OLLAMA_ORIGINS: "*"

  # Markitdown Worker
  markitdown-worker:
    build: ./workers/markitdown
    environment:
      NATS_URL: nats://nats:4222
      LOG_LEVEL: info
    depends_on:
      - nats
    deploy:
      replicas: 1

volumes:
  nats_data:
  ollama_models:
```

### Kubernetes Deployment

```yaml
# k8s/embeddings-worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: embeddings-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: embeddings-worker
  template:
    metadata:
      labels:
        app: embeddings-worker
    spec:
      containers:
      - name: embeddings-worker
        image: mcp-tools/embeddings-worker:latest
        env:
        - name: NATS_URL
          value: "nats://nats-service:4222"
        - name: EMBEDDING_PROVIDER
          value: "ollama"
        - name: OLLAMA_BASE_URL  
          value: "http://ollama-service:11434"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring & Observability

### Health Checks

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  const health: HealthCheck = {
    status: 'healthy',
    uptime: Date.now() - this.startTime,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: Date.now(),
    dependencies: {
      nats: {
        status: this.natsConnection?.isClosed() ? 'unhealthy' : 'healthy',
        lastCheck: Date.now()
      },
      embedding_provider: {
        status: 'healthy', // Could test with ping
        lastCheck: Date.now()
      }
    }
  };
  
  res.json(health);
});
```

### Metrics Collection

```typescript
// Prometheus metrics
import { register, Counter, Histogram, Gauge } from 'prom-client';

const embeddingRequests = new Counter({
  name: 'embeddings_requests_total',
  help: 'Total number of embedding requests',
  labelNames: ['provider', 'status']
});

const embeddingDuration = new Histogram({
  name: 'embeddings_duration_seconds',
  help: 'Embedding generation duration',
  labelNames: ['provider'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeConnections = new Gauge({
  name: 'nats_connections_active',
  help: 'Number of active NATS connections'
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

### Logging Configuration

```typescript
// Structured logging with Winston
const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: {
    service: 'embeddings-worker',
    version: process.env.npm_package_version
  },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

## Performance Characteristics

### Embeddings Worker

| Metric | Value | Notes |
|--------|-------|-------|
| **Throughput** | ~100 embeddings/sec | Ollama on M1 Mac |
| **Latency** | 50-200ms per embedding | Depends on text length |
| **Memory Usage** | ~256MB base + cache | Configurable cache size |
| **Batch Size** | 32 embeddings | Configurable, provider-dependent |
| **Cache Hit Rate** | 60-80% | Varies by use case |

### Memory Processing

| Metric | Value | Notes |
|--------|-------|-------|
| **Processing Time** | 100-500ms per memory | Includes embedding + analysis |
| **Relationship Detection** | 50-200ms | Depends on similarity threshold |
| **Memory Usage** | ~128MB base | Minimal memory footprint |
| **Concurrency** | 10 parallel operations | Configurable |

## Error Handling & Resilience

### Retry Strategies

```typescript
// Exponential backoff with jitter
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) break;
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttempt = 0;

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

## Development Guidelines

### Worker Development Checklist

- [ ] Extend `BaseWorkerConfig` for configuration
- [ ] Implement health check endpoint  
- [ ] Add structured logging with context
- [ ] Include metrics collection
- [ ] Implement graceful shutdown
- [ ] Add comprehensive error handling
- [ ] Write unit and integration tests
- [ ] Document NATS message contracts
- [ ] Configure Docker/Kubernetes deployment
- [ ] Set up monitoring dashboards

### Testing Strategy

```typescript
// Integration test example
describe('EmbeddingsWorker', () => {
  let worker: EmbeddingsWorker;
  let natsServer: NatsTestServer;

  beforeAll(async () => {
    natsServer = await startNatsTestServer();
    worker = new EmbeddingsWorker({
      natsUrl: natsServer.url,
      embeddingProvider: 'mock'
    });
    await worker.start();
  });

  afterAll(async () => {
    await worker.stop();
    await natsServer.stop();
  });

  it('should process embedding requests', async () => {
    const request: EmbeddingRequest = {
      id: 'test-1',
      text: 'Hello world',
      request_id: 'req-123'
    };

    const response = await natsServer.request(
      'embeddings.request',
      JSON.stringify(request)
    );

    const embeddingResponse: EmbeddingResponse = JSON.parse(response.data);
    expect(embeddingResponse.request_id).toBe(request.request_id);
    expect(embeddingResponse.embedding).toHaveLength(384);
  });
});
```

## Future Enhancements

### Planned Workers

1. **Image Processing Worker**: Extract text from images, generate image embeddings
2. **Audio Processing Worker**: Transcribe audio, generate audio embeddings  
3. **Code Analysis Worker**: Parse code, detect patterns, generate embeddings
4. **Translation Worker**: Multi-language support with translation services
5. **Summarization Worker**: Generate summaries using LLM APIs

### Performance Improvements

1. **GPU Acceleration**: CUDA support for local embedding generation
2. **Model Caching**: Intelligent model loading and caching strategies
3. **Streaming Processing**: Real-time processing for large documents
4. **Auto-scaling**: Dynamic worker scaling based on queue depth
5. **Edge Deployment**: Deploy workers closer to data sources

The TypeScript Workers Architecture provides a robust, scalable foundation for the MCP Tools ecosystem, with built-in observability, error handling, and performance optimization.