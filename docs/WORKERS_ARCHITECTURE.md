# TypeScript Workers Architecture

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [Backend Integration](BACKEND_INTEGRATION.md) | [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)

## Overview

The MCP Tools system uses TypeScript-based background workers to handle asynchronous processing tasks like vector embedding generation, memory relationship analysis, and document processing. These workers are built using modern TypeScript patterns and integrate seamlessly with the NATS message broker for reliable job processing.

## Worker Types

### 1. Embeddings Worker

📁 **Location**: `workers/embeddings/`
🔗 **Integration**: Processes content for vector search capabilities

#### Architecture
```typescript
// workers/embeddings/src/worker.ts
export class EmbeddingsWorker {
  private nats: NatsConnection;
  private qdrant: QdrantClient;
  private providers: Map<string, EmbeddingProvider>;

  constructor(config: EmbeddingsConfig) {
    this.setupProviders(config.providers);
    this.initializeConnections(config);
  }

  async start(): Promise<void> {
    await this.subscribeToJobs();
  }

  private async subscribeToJobs(): Promise<void> {
    const subscription = await this.nats.subscribe('vector.index.request', {
      queue: 'embeddings-workers'
    });

    for await (const msg of subscription) {
      try {
        const job = JSON.parse(msg.data.toString()) as EmbeddingJob;
        await this.processEmbeddingJob(job);
        msg.ack();
      } catch (error) {
        console.error('Embedding job processing error:', error);
        msg.nak();
      }
    }
  }

  private async processEmbeddingJob(job: EmbeddingJob): Promise<void> {
    const provider = this.getProvider(job.provider || 'openai');
    const embedding = await provider.generateEmbedding(job.content);

    await this.qdrant.upsert(job.collection, {
      id: job.entityId,
      vector: embedding,
      payload: {
        ...job.metadata,
        entity_type: job.entityType,
        content_hash: this.hashContent(job.content),
        indexed_at: new Date().toISOString()
      }
    });
  }
}
```

#### Supported Providers
```typescript
// workers/embeddings/src/providers/
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>;
  generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

export class OpenAIProvider implements EmbeddingProvider {
  private client: OpenAI;

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-ada-002',
      input: this.preprocessText(text)
    });
    return response.data[0].embedding;
  }
}

export class OllamaProvider implements EmbeddingProvider {
  private baseUrl: string;

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: this.preprocessText(text)
      })
    });
    const data = await response.json();
    return data.embedding;
  }
}
```

### 2. Memory Processing Worker

📁 **Location**: `core/src/services/memory-processing/`
🔗 **Integration**: Analyzes content relationships and builds knowledge graphs

#### Architecture
```typescript
// core/src/services/memory-processing/service.ts
export class MemoryProcessingService {
  private nats: NatsConnection;
  private qdrant: QdrantClient;
  private database: Database;
  private relationshipDetector: RelationshipDetector;

  async start(): Promise<void> {
    await this.subscribeToJobs();
  }

  private async subscribeToJobs(): Promise<void> {
    const subscription = await this.nats.subscribe('relationship.analyze.request', {
      queue: 'memory-processing-workers'
    });

    for await (const msg of subscription) {
      try {
        const job = JSON.parse(msg.data.toString()) as RelationshipAnalysisJob;
        await this.processRelationshipAnalysis(job);
        msg.ack();
      } catch (error) {
        console.error('Relationship analysis error:', error);
        msg.nak();
      }
    }
  }

  private async processRelationshipAnalysis(job: RelationshipAnalysisJob): Promise<void> {
    // Find semantically similar content
    const embedding = await this.generateEmbedding(job.content);
    const similarContent = await this.qdrant.search(job.collection, {
      vector: embedding,
      limit: 20,
      score_threshold: 0.7,
      filter: {
        must_not: [{ key: 'entity_id', match: { value: job.entityId } }]
      }
    });

    // Extract explicit relationships
    const explicitRelationships = await this.relationshipDetector.extractRelationships(
      job.content,
      job.context
    );

    // Store relationships
    const relationships: Relationship[] = [
      ...this.buildSemanticRelationships(job.entityId, similarContent),
      ...explicitRelationships
    ];

    await this.storeRelationships(relationships);
  }
}
```

#### Content Analysis Engine
```typescript
// core/src/services/memory-processing/analysis/content-analyzer.ts
export class ContentAnalyzer {
  async extractConcepts(content: string): Promise<Concept[]> {
    // Extract named entities, key phrases, and concepts
    const entities = await this.extractNamedEntities(content);
    const keyPhrases = await this.extractKeyPhrases(content);
    const topics = await this.extractTopics(content);

    return [
      ...entities.map(e => ({ type: 'entity', value: e.text, confidence: e.confidence })),
      ...keyPhrases.map(p => ({ type: 'phrase', value: p.text, confidence: p.relevance })),
      ...topics.map(t => ({ type: 'topic', value: t.label, confidence: t.score }))
    ];
  }

  async findCrossReferences(content: string): Promise<CrossReference[]> {
    const references: CrossReference[] = [];
    
    // Find wiki-style links [[Page Name]]
    const wikiLinks = content.match(/\[\[([^\]]+)\]\]/g) || [];
    references.push(...wikiLinks.map(link => ({
      type: 'wiki_link',
      target: link.slice(2, -2),
      context: this.extractContext(content, link)
    })));

    // Find task references #TASK-123
    const taskRefs = content.match(/#TASK-\d+/g) || [];
    references.push(...taskRefs.map(ref => ({
      type: 'task_reference',
      target: ref,
      context: this.extractContext(content, ref)
    })));

    return references;
  }
}
```

### 3. Markitdown Worker

📁 **Location**: `workers/markitdown/`
🔗 **Integration**: Converts documents to markdown format for processing

#### Architecture
```typescript
// workers/markitdown/src/worker.ts
export class MarkitdownWorker {
  private nats: NatsConnection;
  private converter: DocumentConverter;

  async start(): Promise<void> {
    await this.subscribeToJobs();
  }

  private async subscribeToJobs(): Promise<void> {
    const subscription = await this.nats.subscribe('document.convert.request', {
      queue: 'markitdown-workers'
    });

    for await (const msg of subscription) {
      try {
        const job = JSON.parse(msg.data.toString()) as ConversionJob;
        await this.processConversionJob(job);
        msg.ack();
      } catch (error) {
        console.error('Document conversion error:', error);
        msg.nak();
      }
    }
  }

  private async processConversionJob(job: ConversionJob): Promise<void> {
    const result = await this.converter.convertToMarkdown(
      job.source,
      job.sourceType,
      job.options
    );

    // Publish converted content for further processing
    await this.nats.publish('document.converted', {
      jobId: job.id,
      originalId: job.entityId,
      markdown: result.markdown,
      metadata: result.metadata,
      extractedImages: result.images
    });
  }
}
```

#### Document Converter
```typescript
// workers/markitdown/src/converter.ts
export class DocumentConverter {
  async convertToMarkdown(
    source: string | Buffer,
    sourceType: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResult> {
    switch (sourceType) {
      case 'pdf':
        return await this.convertPDF(source as Buffer, options);
      case 'docx':
        return await this.convertDocx(source as Buffer, options);
      case 'html':
        return await this.convertHTML(source as string, options);
      case 'xlsx':
        return await this.convertExcel(source as Buffer, options);
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  private async convertPDF(buffer: Buffer, options: ConversionOptions): Promise<ConversionResult> {
    // Use pdf-parse or similar library
    const pdfData = await pdf(buffer);
    
    return {
      markdown: this.cleanupText(pdfData.text),
      metadata: {
        pages: pdfData.numpages,
        info: pdfData.info
      },
      images: [] // Extract images if needed
    };
  }
}
```

## Worker Management and Scaling

### Job Queue Configuration
```typescript
// shared/src/messaging/job-queue.ts
export class JobQueue {
  private nats: NatsConnection;
  private js: JetStreamManager;

  async setupStreams(): Promise<void> {
    const streams = [
      {
        name: 'EMBEDDINGS_JOBS',
        subjects: ['vector.index.request'],
        retention: RetentionPolicy.WorkQueue,
        storage: StorageType.File,
        max_msgs: 10000,
        max_age: 86400 // 24 hours
      },
      {
        name: 'MEMORY_PROCESSING_JOBS',
        subjects: ['relationship.analyze.request'],
        retention: RetentionPolicy.WorkQueue,
        storage: StorageType.File,
        max_msgs: 5000,
        max_age: 86400
      },
      {
        name: 'DOCUMENT_CONVERSION_JOBS',
        subjects: ['document.convert.request'],
        retention: RetentionPolicy.WorkQueue,
        storage: StorageType.File,
        max_msgs: 1000,
        max_age: 43200 // 12 hours
      }
    ];

    for (const stream of streams) {
      await this.js.streams.add(stream);
    }
  }
}
```

### Health Monitoring
```typescript
// shared/src/monitoring/worker-health.ts
export class WorkerHealthMonitor {
  private metrics: Map<string, WorkerMetrics> = new Map();

  async trackWorkerHealth(): Promise<void> {
    setInterval(async () => {
      for (const [workerType, metrics] of this.metrics) {
        const health = await this.checkWorkerHealth(workerType);
        
        if (health.status === 'unhealthy') {
          await this.alertUnhealthyWorker(workerType, health);
        }
        
        this.updateMetrics(workerType, health);
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkWorkerHealth(workerType: string): Promise<HealthStatus> {
    const queueInfo = await this.getQueueInfo(workerType);
    
    return {
      status: queueInfo.pending > 1000 ? 'unhealthy' : 'healthy',
      pending_jobs: queueInfo.pending,
      processing_rate: this.calculateProcessingRate(workerType),
      last_processed: queueInfo.last_processed,
      error_rate: this.calculateErrorRate(workerType)
    };
  }
}
```

## Deployment and Configuration

### Docker Configuration
```dockerfile
# workers/embeddings/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY config/ ./config/

ENV NODE_ENV=production
EXPOSE 3004

CMD ["node", "dist/index.js"]
```

### Environment Configuration
```typescript
// workers/embeddings/src/config.ts
export interface EmbeddingsConfig {
  nats: {
    servers: string[];
    credentials?: string;
  };
  qdrant: {
    host: string;
    port: number;
    apiKey?: string;
  };
  providers: {
    openai?: {
      apiKey: string;
      model: string;
    };
    ollama?: {
      baseUrl: string;
      model: string;
    };
  };
  concurrency: number;
  batchSize: number;
}
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
        - name: NATS_SERVERS
          value: "nats://nats:4222"
        - name: QDRANT_HOST
          value: "qdrant"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Performance Characteristics

### Throughput Metrics
- **Embeddings Worker**: ~100 documents/minute (varies by provider and content size)
- **Memory Processing Worker**: ~50 relationship analyses/minute
- **Markitdown Worker**: ~20 document conversions/minute (varies by document type)

### Scaling Guidelines
- **CPU-bound**: Embeddings generation and content analysis
- **Memory-bound**: Large document processing and vector operations
- **I/O-bound**: Database operations and API calls

### Monitoring Points
- Queue depth and processing rates
- Worker memory usage and CPU utilization
- API rate limits and error rates
- Vector database performance metrics

## Integration Patterns

### Message Flow
```
MCP Server → NATS → Worker → Processing → Results → NATS → MCP Server
```

### Error Handling
- Automatic retries with exponential backoff
- Dead letter queues for failed jobs
- Health checks and automatic restarts
- Graceful degradation when workers are unavailable

### Data Consistency
- Idempotent job processing
- Transactional updates where possible
- Eventual consistency for search indexes
- Conflict resolution for concurrent updates

## Next Steps

- 🔗 **Backend Integration**: [Backend Integration Layer](BACKEND_INTEGRATION.md)
- ⚛️ **Frontend Integration**: [Web Client Architecture](WEB_CLIENT_ARCHITECTURE.md)
- 📊 **System Flows**: [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)
- 🔌 **API Implementation**: [API Specifications](API_SPECIFICATIONS.md)