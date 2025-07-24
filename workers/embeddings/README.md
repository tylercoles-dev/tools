# MCP Tools Embeddings Worker

A TypeScript worker that generates vector embeddings via NATS requests. This worker focuses solely on embedding generation and leaves storage to the requesting services.

## Features

- **Multiple Providers**: Support for Ollama and OpenAI embedding APIs
- **NATS Integration**: Request/response pattern via NATS messaging
- **Batch Processing**: Efficient batch embedding generation
- **Caching**: Built-in SHA-256 based caching for embeddings
- **Health Checks**: Automated provider health monitoring
- **Graceful Shutdown**: Proper cleanup on termination

## Supported Providers

### Ollama
- Local embedding server using ollama.cpp
- Models: `nomic-embed-text:latest`, `all-minilm`, etc.
- Automatic model pulling if not available

### OpenAI
- OpenAI Embeddings API
- Models: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
- Built-in rate limiting and error handling

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Embedding Provider
EMBEDDING_PROVIDER=ollama  # or 'openai'

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=nomic-embed-text:latest

# OpenAI Configuration  
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=text-embedding-3-small

# NATS Configuration
NATS_URL=nats://localhost:4222

# Worker Configuration
WORKER_NAME=embeddings-worker
LOG_LEVEL=info
BATCH_SIZE=32
```

## Usage

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## NATS API

### Single Embedding Request

**Subject**: `embeddings.request`

**Request**:
```json
{
  "id": "unique-id",
  "text": "Text to embed",
  "user_id": "optional-user-id",
  "request_id": "request-123"
}
```

**Response**:
```json
{
  "request_id": "request-123",
  "embedding": [0.1, 0.2, 0.3, ...],
  "dimension": 768,
  "processing_time_ms": 150
}
```

### Batch Embedding Request

**Subject**: `embeddings.batch`

**Request**:
```json
{
  "request_id": "batch-123",
  "texts": ["Text 1", "Text 2", "Text 3"],
  "user_id": "optional-user-id"
}
```

**Response**:
```json
{
  "request_id": "batch-123",
  "embeddings": [[0.1, 0.2, ...], [0.3, 0.4, ...], [0.5, 0.6, ...]],
  "dimension": 768,
  "processing_time_ms": 450,
  "batch_size": 3
}
```

### Stats Request

**Subject**: `embeddings.stats`

**Response**:
```json
{
  "totalRequests": 1234,
  "successfulEmbeddings": 1200,
  "failedEmbeddings": 34,
  "averageProcessingTime": 180,
  "uptime": 3600000,
  "memoryUsage": {
    "heapUsed": 50000000,
    "heapTotal": 70000000,
    "external": 5000000
  }
}
```

## Architecture

This worker follows a simplified architecture focused on embedding generation:

1. **Request Handling**: Processes NATS requests for single and batch embeddings
2. **Provider Abstraction**: Unified interface for different embedding providers
3. **Caching**: SHA-256 based caching to avoid duplicate work
4. **Error Handling**: Comprehensive error handling with provider-specific logic
5. **Monitoring**: Built-in health checks and statistics

## Error Handling

The worker handles various error scenarios:

- **Provider Unavailable**: Connection errors to Ollama/OpenAI
- **Rate Limiting**: OpenAI API rate limits with proper error codes
- **Invalid Input**: Malformed requests or empty text
- **Model Errors**: Missing models or dimension mismatches

## Scaling

The worker can be scaled horizontally by running multiple instances. NATS queue groups ensure load distribution across workers.

## Monitoring

The worker provides:

- **Health Checks**: Periodic provider testing
- **Statistics**: Request counts, success rates, timing
- **Logging**: Structured JSON logging with configurable levels
- **Graceful Shutdown**: Proper cleanup on termination signals