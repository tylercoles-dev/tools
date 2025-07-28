# TypeScript Path Aliases Configuration

This document explains the TypeScript path alias system configured for the MCP Tools monorepo.

## Root Configuration

The root `tsconfig.json` establishes path mappings for all projects in the monorepo:

### Core Packages
- `@mcp-tools/core` → `./core/src/index.ts`
- `@mcp-tools/gateway` → `./gateway/src/index.ts`
- `@mcp-tools/web` → `./web/src/index.ts`

### MCP Servers
- `@mcp-tools/kanban` → `./servers/kanban/src/index.ts`
- `@mcp-tools/memory` → `./servers/memory/src/index.ts`
- `@mcp-tools/wiki` → `./servers/wiki/src/index.ts`

### Workers
- `@mcp-tools/embeddings` → `./workers/embeddings/src/index.ts`
- `@mcp-tools/markitdown` → `./workers/markitdown/src/index.ts`

### Shared Aliases
- `@shared/*` → `./core/src/shared/*`
- `@types/*` → `./core/src/shared/types/*`
- `@utils/*` → `./core/src/utils/*`

## Project-Specific Aliases

Each project extends the root configuration with its own aliases:

### Gateway (`./gateway/`)
```typescript
import { AnalyticsService } from '@gateway/services/AnalyticsService';
import { authMiddleware } from '@gateway/middleware/auth';
import { AnalyticsEvent } from '@types/analytics';
```

### Web Client (`./web/`)
```typescript
import { Button } from '@components/ui/button';
import { useAnalytics } from '@hooks/use-analytics';
import { ApiClient } from '@lib/api-client';
```

### Servers (`./servers/*/`)
```typescript
// In kanban server
import { KanbanCard } from '@kanban/types';
import { AnalyticsEvent } from '@types/analytics';

// In memory server  
import { MemoryGraph } from '@memory/graph/GraphEngine';
import { SharedTypes } from '@shared/types';
```

### Workers (`./workers/*/`)
```typescript
// In embeddings worker
import { EmbeddingProvider } from '@embeddings/providers/base';
import { CoreTypes } from '@mcp-tools/core';
```

## Usage Examples

### Cross-Project Imports
```typescript
// From gateway, import core types
import { AnalyticsEvent, TaskPrediction } from '@mcp-tools/core';

// From web client, import shared utilities
import { validateSchema } from '@shared/utils/validation';

// From any project, import shared types
import { ApiResponse, DatabaseConfig } from '@types/api';
```

### Local Project Imports
```typescript
// Within gateway project
import { InsightsEngine } from '@/services/InsightsEngine';
import { validateRequest } from '@/middleware/validation';

// Within web project
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { useRealtimeAnalytics } from '@/hooks/use-realtime-analytics';
```

## IDE Configuration

Most modern IDEs (VS Code, WebStorm, etc.) will automatically pick up these path mappings from the tsconfig.json files and provide:

- **IntelliSense/AutoComplete**: Full type support across projects
- **Go to Definition**: Navigate between related files across packages
- **Refactoring**: Rename symbols across the entire monorepo
- **Import Suggestions**: Automatic import path resolution

## Build System Integration

The path aliases work with all build tools in the monorepo:

- **tsup**: Core and gateway builds
- **Next.js**: Web client with automatic path resolution
- **TypeScript**: Direct compilation for servers and workers
- **Jest**: Testing with path alias support

## Benefits

1. **Clean Imports**: No more `../../../../` relative paths
2. **Refactoring Safety**: Move files without breaking imports
3. **Consistent Structure**: Standard aliases across all projects
4. **IDE Support**: Full IntelliSense and navigation
5. **Build Performance**: Optimized module resolution

## Troubleshooting

### Common Issues

1. **Build Errors**: Ensure all referenced projects are built first
2. **IDE Not Recognizing**: Restart TypeScript service in your IDE
3. **Import Errors**: Verify the target file exists at the aliased path

### Verification

Test that aliases are working:

```bash
# Build core package first
cd core && npm run build

# Build gateway (depends on core)
cd ../gateway && npm run build

# Build web client
cd ../web && npm run build
```

All builds should complete successfully with proper path resolution.