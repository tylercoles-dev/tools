# MarkItDown Worker

A NATS-based worker service that converts documents to Markdown using Microsoft's MarkItDown library.

## Features

- **Document Conversion**: Convert various document formats (PDF, Word, Excel, PowerPoint, etc.) to Markdown
- **URL Conversion**: Convert web pages and online documents to Markdown
- **NATS Integration**: Responds to NATS requests for distributed processing
- **Concurrency Control**: Configurable maximum concurrent jobs
- **Health Monitoring**: Built-in stats and health check endpoints
- **Graceful Shutdown**: Proper cleanup of active jobs on termination

## Prerequisites

- Node.js 18+
- Python 3.8+ with MarkItDown installed
- NATS server

### Install MarkItDown

```bash
pip install markitdown
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Environment variables:
- `NATS_URL`: NATS server URL (default: `nats://localhost:4222`)
- `LOG_LEVEL`: Logging level (default: `info`)
- `MAX_CONCURRENT_JOBS`: Maximum concurrent conversions (default: `5`)
- `REQUEST_TIMEOUT`: Request timeout in milliseconds (default: `30000`)
- `HEALTH_CHECK_INTERVAL`: Health check interval (default: `30000`)

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## NATS Subjects

The worker listens on the following NATS subjects:

### Document Conversion
**Subject**: `markitdown.convert.document`
**Queue Group**: `markitdown-workers`

Request:
```json
{
  "content": "base64 encoded document content",
  "contentType": "application/pdf",
  "filename": "document.pdf",
  "options": {
    "preserveFormatting": true,
    "includeMetadata": true,
    "stripImages": false,
    "maxLength": 100000
  }
}
```

Response:
```json
{
  "success": true,
  "markdown": "# Document Title\\n\\nContent...",
  "metadata": {
    "title": "Document Title",
    "author": "John Doe",
    "wordCount": 1250,
    "characterCount": 7500,
    "format": "pdf"
  },
  "processingTimeMs": 1500
}
```

### URL Conversion
**Subject**: `markitdown.convert.url`
**Queue Group**: `markitdown-workers`

Request:
```json
{
  "url": "https://example.com/document.pdf",
  "options": {
    "preserveFormatting": true,
    "includeMetadata": true,
    "stripImages": false,
    "timeout": 30000
  }
}
```

Response: Same as document conversion

### Worker Stats
**Subject**: `markitdown.stats`

Response:
```json
{
  "totalRequests": 150,
  "successfulConversions": 142,
  "failedConversions": 8,
  "averageProcessingTime": 2300,
  "uptime": 3600000,
  "memoryUsage": {
    "heapUsed": 45000000,
    "heapTotal": 60000000,
    "external": 5000000
  }
}
```

## Supported Formats

MarkItDown supports various document formats:
- PDF documents
- Microsoft Office (Word, Excel, PowerPoint)
- Images with text (OCR)
- HTML/Web pages
- Plain text files
- And more...

## Error Handling

The worker handles various error scenarios:
- Invalid document formats
- Conversion timeouts
- Resource exhaustion
- Network errors (for URL conversions)

Failed conversions return an error response with details:
```json
{
  "success": false,
  "error": "Failed to convert document: unsupported format",
  "processingTimeMs": 500
}
```

## Monitoring

The worker provides comprehensive logging and metrics:
- Request/response logging
- Performance metrics
- Memory usage tracking
- Active job monitoring
- Health checks

## Docker Support

```dockerfile
FROM node:18-alpine

# Install Python and MarkItDown
RUN apk add --no-cache python3 py3-pip
RUN pip3 install markitdown

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["npm", "start"]
```

## Integration Example

Using the worker from a Node.js application:

```javascript
import { connect, JSONCodec } from 'nats';

const nc = await connect({ servers: 'nats://localhost:4222' });
const jc = JSONCodec();

// Convert a document
const response = await nc.request('markitdown.convert.document', jc.encode({
  content: documentBase64,
  contentType: 'application/pdf',
  filename: 'report.pdf'
}), { timeout: 30000 });

const result = jc.decode(response.data);
if (result.success) {
  console.log('Converted to markdown:', result.markdown);
} else {
  console.error('Conversion failed:', result.error);
}
```