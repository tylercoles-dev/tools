# Technical Debt & Outstanding Tasks

This document tracks all TODO items, incomplete implementations, and technical debt found across the MCP Tools codebase.

## 🚨 **High Priority Issues**

### **1. Memory Service - Critical Missing Features**
**Location**: `core/src/services/memory/service.ts:346`, `servers/memory/src/services/MemoryService.ts`

**Issue**: Memory merging functionality throws "NOT_IMPLEMENTED" error
```typescript
async mergeMemories(_primaryId: string, _secondaryIds: string[], _strategy: string): Promise<MemoryNode> {
  throw new MemoryError('Memory merging not yet implemented', 'NOT_IMPLEMENTED', 501);
}
```

**Impact**: Users cannot merge duplicate or related memories, affecting data quality.

### **2. Memory Analytics - Placeholder Data**
**Location**: Multiple files in memory services

**Issues**:
- `averageImportance: 2.5, // TODO: Calculate from database`
- `mostActiveUsers: [], // TODO: Implement`
- `topProjects: [], // TODO: Implement` 
- `conceptDistribution: {} // TODO: Implement`
- `clusters: [], // TODO: Implement clustering`

**Impact**: Analytics dashboard shows static data instead of real metrics.

### **3. Wiki Service - Incomplete Category & Tag System**
**Location**: `servers/wiki/src/services/WikiService.ts:309-320`

**Issues**:
```typescript
// TODO: Implement removal of existing categories
// TODO: Implement category assignment  
// TODO: Implement removal of existing tags
```

**Impact**: Category and tag management is non-functional.

## 🔧 **Medium Priority Issues**

### **4. Wiki Internal Linking System**
**Location**: `servers/wiki/src/services/WikiService.ts:329`

**Issue**: Page link processing not implemented
```typescript
// TODO: Process internal links and create link relationships
// This would involve:
// 1. Parsing wiki-style links [[PageName]]
// 2. Creating page_links entries
// 3. Validating link targets exist
```

**Impact**: Wiki-style `[[PageName]]` links don't create proper relationships.

### **5. Wiki Version History**
**Location**: `servers/wiki/src/services/WikiService.ts:337`

**Issue**: Page history creation is stubbed
```typescript
// TODO: Implement page history creation
```

**Impact**: No change tracking or version control for wiki pages.

### **6. Kanban Analytics - Incomplete Metrics**
**Location**: `core/src/services/kanban/service.ts:561-563`

**Issues**:
```typescript
cards_by_status: {}, // TODO: Implement status tracking
recent_activity: [] // TODO: Implement activity tracking
```

**Impact**: Kanban dashboard missing key metrics.

### **7. Embeddings Usage Tracking**
**Location**: `workers/embeddings/src/providers/openai.ts:202`

**Issue**: Usage statistics not tracked
```typescript
// TODO: Implement usage tracking
return { totalTokens: 0, apiCalls: 0 };
```

**Impact**: No cost monitoring or usage analytics for embeddings.

## 🔍 **Low Priority Issues**

### **8. Ollama Batch Processing**
**Location**: `workers/embeddings/src/providers/ollama.ts:110`

**Issue**: Sequential processing only
```typescript
// TODO: Add concurrent processing with configurable limit
```

**Impact**: Slower embedding generation for large batches.

### **9. Scraper Processing Time Calculation**
**Location**: `core/src/services/scraper/service.ts:206`

**Issue**: Hardcoded average processing time
```typescript
averageProcessingTime: 5000, // TODO: Calculate from actual data
```

**Impact**: Inaccurate performance metrics.

### **10. Wiki Attachment Support**
**Location**: `servers/wiki/README.md:192`

**Issue**: File attachments planned but not implemented
```markdown
- **attachments**: File attachments (planned)
```

**Impact**: Users cannot attach files to wiki pages.

## 📊 **Database Implementation Gaps**

### **11. PostgreSQL Support**
**Location**: Multiple database configuration files

**Status**: Schemas exist but connection logic incomplete
- Wiki server has PostgreSQL schema but defaults to SQLite
- Memory server lacks PostgreSQL connection implementation

### **12. Memory Database Schema**
**Location**: `servers/memory/src/database/index.ts:80`

**Issue**: Database table creation stubbed
```typescript
// TODO: Create database tables
await this.createTables();
```

## 🎯 **Recommended Action Plan**

### **Phase 1: Critical Fixes (Week 1-2)**
1. Implement memory merging functionality
2. Fix memory analytics to use real data
3. Complete wiki category/tag assignment system

### **Phase 2: Feature Completion (Week 3-4)** 
1. Implement wiki internal linking system
2. Add wiki version history tracking
3. Complete kanban activity tracking

### **Phase 3: Performance & Polish (Week 5-6)**
1. Add embeddings usage tracking
2. Implement concurrent Ollama processing
3. Add real scraper performance metrics

### **Phase 4: Database Improvements (Week 7-8)**
1. Complete PostgreSQL support across all services
2. Implement proper database migrations
3. Add database connection pooling

## 🔍 **Code Quality Notes**

### **Debug/Development Code**
- Multiple `DEBUG=` environment variables in test configs
- Some test files use mock implementations that could be improved
- Several files have integrity warnings for deprecated packages

### **Documentation Inconsistencies**
- Web client marked as "planned" when fully implemented
- REST API roadmap shows "completed" but doesn't reflect current gaps
- Some README files show outdated feature status

## 📝 **Monitoring & Maintenance**

### **Regular Audits Needed**
1. **Monthly**: Search codebase for new TODO/FIXME items
2. **Quarterly**: Review and update technical debt documentation
3. **Bi-annually**: Major refactoring of completed TODO items

### **Code Quality Tools**
Consider adding:
- ESLint rules to flag TODO/FIXME comments
- SonarQube integration for technical debt tracking
- Automated dependency vulnerability scanning

---

**Last Updated**: January 2025  
**Next Review**: February 2025