# Rust Background Workers Architecture

🔙 **Back to**: [Main Architecture](ARCHITECTURE.md) | 🔍 **See also**: [Backend Integration](BACKEND_INTEGRATION.md) | [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)

## Overview

The Rust-based NATS workers handle CPU-intensive background processing tasks including vector indexing, relationship analysis, and data synchronization. Each worker is designed as a stateless, horizontally scalable microservice.

## Worker Architecture

### Base Worker Framework

```rust
// src/lib.rs
use async_nats as nats;
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn, instrument};

#[async_trait::async_trait]
pub trait Worker {
    type Message: for<'de> Deserialize<'de> + Send + 'static;
    
    fn name(&self) -> &'static str;
    fn subjects(&self) -> Vec<String>;
    fn queue_group(&self) -> Option<String> { Some(self.name().to_string()) }
    
    async fn process_message(&self, message: Self::Message) -> Result<(), WorkerError>;
    async fn initialize(&self) -> Result<(), WorkerError> { Ok(()) }
    async fn shutdown(&self) -> Result<(), WorkerError> { Ok(()) }
}

#[derive(Debug)]
pub enum WorkerError {
    NatsError(String),
    ProcessingError(String),
    DatabaseError(String),
    ValidationError(String),
}

pub struct WorkerRunner<W: Worker> {
    worker: W,
    nats_client: nats::Client,
    config: WorkerConfig,
}

impl<W: Worker> WorkerRunner<W> {
    pub fn new(worker: W, nats_client: nats::Client, config: WorkerConfig) -> Self {
        Self { worker, nats_client, config }
    }
    
    pub async fn run(self) -> Result<(), WorkerError> {
        info!("Starting worker: {}", self.worker.name());
        
        self.worker.initialize().await?;
        
        let subjects = self.worker.subjects();
        let queue_group = self.worker.queue_group();
        
        for subject in subjects {
            let subscriber = if let Some(queue) = &queue_group {
                self.nats_client.queue_subscribe(&subject, queue).await
                    .map_err(|e| WorkerError::NatsError(e.to_string()))?
            } else {
                self.nats_client.subscribe(&subject).await
                    .map_err(|e| WorkerError::NatsError(e.to_string()))?
            };
            
            let worker = &self.worker;
            tokio::spawn(async move {
                while let Some(message) = subscriber.next().await {
                    match serde_json::from_slice::<W::Message>(&message.payload) {
                        Ok(parsed_message) => {
                            if let Err(e) = worker.process_message(parsed_message).await {
                                error!("Failed to process message: {:?}", e);
                                // Could implement dead letter queue here
                            }
                        }
                        Err(e) => {
                            error!("Failed to deserialize message: {}", e);
                        }
                    }
                }
            });
        }
        
        // Keep the main task alive
        loop {
            sleep(Duration::from_secs(30)).await;
            info!("Worker {} is running", self.worker.name());
        }
    }
}

#[derive(Clone)]
pub struct WorkerConfig {
    pub nats_url: String,
    pub postgres_url: String,
    pub qdrant_url: String,
    pub openai_api_key: String,
    pub batch_size: usize,
    pub retry_attempts: u32,
    pub retry_delay_ms: u64,
}
```

## Vector Indexing Worker

🔗 **Integration**: [Qdrant Vector Database](BACKEND_INTEGRATION.md#qdrant-vector-database-integration)

```rust
// src/workers/vector_indexing.rs
use crate::{Worker, WorkerError, WorkerConfig};
use qdrant_client::{QdrantClient, qdrant::PointStruct};
use openai_api_rs::v1::api::OpenAIClient;
use openai_api_rs::v1::embedding::{EmbeddingRequest, EmbeddingResponse};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct VectorIndexRequest {
    pub message_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
    pub data: VectorIndexData,
}

#[derive(Debug, Deserialize)]
pub struct VectorIndexData {
    pub entity_id: String,
    pub entity_type: EntityType,
    pub content: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    Task,
    Page,
    Memory,
}

pub struct VectorIndexingWorker {
    qdrant_client: QdrantClient,
    openai_client: OpenAIClient,
    config: WorkerConfig,
}

impl VectorIndexingWorker {
    pub fn new(config: WorkerConfig) -> Result<Self, WorkerError> {
        let qdrant_client = QdrantClient::from_url(&config.qdrant_url)
            .build()
            .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
            
        let openai_client = OpenAIClient::new(&config.openai_api_key);
        
        Ok(Self {
            qdrant_client,
            openai_client,
            config,
        })
    }
    
    #[instrument(skip(self, content))]
    async fn generate_embedding(&self, content: &str) -> Result<Vec<f32>, WorkerError> {
        let request = EmbeddingRequest::new(
            "text-embedding-ada-002".to_string(),
            vec![self.preprocess_text(content)]
        );
        
        let response = self.openai_client.embedding(request).await
            .map_err(|e| WorkerError::ProcessingError(e.to_string()))?;
            
        Ok(response.data[0].embedding.clone())
    }
    
    fn preprocess_text(&self, text: &str) -> String {
        text.trim()
            .chars()
            .take(8000) // OpenAI token limit safety
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }
    
    fn get_collection_name(&self, entity_type: &EntityType) -> String {
        match entity_type {
            EntityType::Task => "kanban_tasks".to_string(),
            EntityType::Page => "wiki_pages".to_string(),
            EntityType::Memory => "memory_nodes".to_string(),
        }
    }
    
    #[instrument(skip(self, data))]
    async fn index_entity(&self, data: &VectorIndexData) -> Result<(), WorkerError> {
        let embedding = self.generate_embedding(&data.content).await?;
        
        let collection_name = self.get_collection_name(&data.entity_type);
        
        let point = PointStruct::new(
            Uuid::new_v4().to_string(),
            embedding,
            data.metadata.clone()
        );
        
        self.qdrant_client
            .upsert_points_blocking(&collection_name, vec![point], None)
            .await
            .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
            
        info!("Indexed entity {} in collection {}", data.entity_id, collection_name);
        
        Ok(())
    }
}

#[async_trait::async_trait]
impl Worker for VectorIndexingWorker {
    type Message = VectorIndexRequest;
    
    fn name(&self) -> &'static str {
        "vector_indexing"
    }
    
    fn subjects(&self) -> Vec<String> {
        vec![
            "vector.index.request".to_string(),
            "mcp.*.created".to_string(),
            "mcp.*.updated".to_string(),
        ]
    }
    
    #[instrument(skip(self, message))]
    async fn process_message(&self, message: Self::Message) -> Result<(), WorkerError> {
        info!("Processing vector index request for entity: {}", message.data.entity_id);
        
        // Retry logic with exponential backoff
        let mut attempts = 0;
        let max_attempts = self.config.retry_attempts;
        
        while attempts < max_attempts {
            match self.index_entity(&message.data).await {
                Ok(_) => return Ok(()),
                Err(e) => {
                    attempts += 1;
                    if attempts >= max_attempts {
                        error!("Failed to index entity after {} attempts: {:?}", max_attempts, e);
                        return Err(e);
                    }
                    
                    let delay = Duration::from_millis(
                        self.config.retry_delay_ms * 2_u64.pow(attempts - 1)
                    );
                    warn!("Attempt {} failed, retrying in {:?}: {:?}", attempts, delay, e);
                    tokio::time::sleep(delay).await;
                }
            }
        }
        
        unreachable!()
    }
}
```

## Relationship Analysis Worker

🔗 **Related**: [Memory Graph Server](MCP_SERVER_DETAILS.md#memory-graph-mcp-server) | [Data Flows](DATA_FLOW_DIAGRAMS.md#3-memory-graph-creation-and-relationship-discovery)

```rust
// src/workers/relationship_analysis.rs
use crate::{Worker, WorkerError, WorkerConfig};
use qdrant_client::QdrantClient;
use sqlx::{PgPool, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct RelationshipAnalysisRequest {
    pub message_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
    pub data: RelationshipAnalysisData,
}

#[derive(Debug, Deserialize)]
pub struct RelationshipAnalysisData {
    pub entity_id: String,
    pub entity_type: String,
    pub content: String,
    pub context: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct Relationship {
    pub source_id: String,
    pub target_id: String,
    pub relationship_type: RelationshipType,
    pub strength: f32,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RelationshipType {
    SemanticSimilarity,
    TopicalRelevance,
    SequentialDependency,
    ConceptualHierarchy,
    CrossReference,
}

pub struct RelationshipAnalysisWorker {
    qdrant_client: QdrantClient,
    pg_pool: PgPool,
    config: WorkerConfig,
}

impl RelationshipAnalysisWorker {
    pub async fn new(config: WorkerConfig) -> Result<Self, WorkerError> {
        let qdrant_client = QdrantClient::from_url(&config.qdrant_url)
            .build()
            .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
            
        let pg_pool = PgPool::connect(&config.postgres_url).await
            .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
            
        Ok(Self {
            qdrant_client,
            pg_pool,
            config,
        })
    }
    
    #[instrument(skip(self, data))]
    async fn find_semantic_relationships(
        &self, 
        data: &RelationshipAnalysisData
    ) -> Result<Vec<Relationship>, WorkerError> {
        let collection_name = self.get_collection_for_type(&data.entity_type);
        
        // Get vector for the entity
        let entity_vector = self.get_entity_vector(&data.entity_id, &collection_name).await?;
        
        // Search for similar entities
        let search_results = self.qdrant_client
            .search_points(&qdrant_client::qdrant::SearchPoints {
                collection_name: collection_name.clone(),
                vector: entity_vector,
                limit: 20,
                score_threshold: Some(0.7),
                ..Default::default()
            })
            .await
            .map_err(|e| WorkerError::ProcessingError(e.to_string()))?;
            
        let mut relationships = Vec::new();
        
        for result in search_results.result {
            if let Some(payload) = result.payload {
                if let Some(target_id) = payload.get("entity_id") {
                    let target_id_str = target_id.to_string().trim_matches('"').to_string();
                    
                    if target_id_str != data.entity_id {
                        relationships.push(Relationship {
                            source_id: data.entity_id.clone(),
                            target_id: target_id_str,
                            relationship_type: RelationshipType::SemanticSimilarity,
                            strength: result.score,
                            metadata: serde_json::json!({
                                "collection": collection_name,
                                "similarity_score": result.score
                            }),
                        });
                    }
                }
            }
        }
        
        Ok(relationships)
    }
    
    async fn find_cross_references(
        &self,
        data: &RelationshipAnalysisData
    ) -> Result<Vec<Relationship>, WorkerError> {
        let mut relationships = Vec::new();
        
        // Extract entity IDs mentioned in content
        let mentioned_entities = self.extract_entity_references(&data.content).await?;
        
        for entity_ref in mentioned_entities {
            if entity_ref.id != data.entity_id {
                relationships.push(Relationship {
                    source_id: data.entity_id.clone(),
                    target_id: entity_ref.id,
                    relationship_type: RelationshipType::CrossReference,
                    strength: 1.0,
                    metadata: serde_json::json!({
                        "reference_type": entity_ref.entity_type,
                        "context": entity_ref.context
                    }),
                });
            }
        }
        
        Ok(relationships)
    }
    
    async fn extract_entity_references(
        &self,
        content: &str
    ) -> Result<Vec<EntityReference>, WorkerError> {
        let mut references = Vec::new();
        
        // Simple regex patterns for now - could be enhanced with NLP
        let patterns = vec![
            (r"task:([a-f0-9-]+)", "task"),
            (r"page:([a-f0-9-]+)", "page"),
            (r"memory:([a-f0-9-]+)", "memory"),
        ];
        
        for (pattern, entity_type) in patterns {
            let regex = regex::Regex::new(pattern)
                .map_err(|e| WorkerError::ProcessingError(e.to_string()))?;
                
            for cap in regex.captures_iter(content) {
                if let Some(id) = cap.get(1) {
                    references.push(EntityReference {
                        id: id.as_str().to_string(),
                        entity_type: entity_type.to_string(),
                        context: cap.get(0).unwrap().as_str().to_string(),
                    });
                }
            }
        }
        
        Ok(references)
    }
    
    async fn persist_relationships(
        &self,
        relationships: Vec<Relationship>
    ) -> Result<(), WorkerError> {
        for relationship in relationships {
            sqlx::query!(
                r#"
                INSERT INTO relationships (id, source_id, target_id, relationship_type, strength, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (source_id, target_id, relationship_type) 
                DO UPDATE SET 
                    strength = $5,
                    metadata = $6,
                    updated_at = $7
                "#,
                uuid::Uuid::new_v4(),
                relationship.source_id,
                relationship.target_id,
                serde_json::to_string(&relationship.relationship_type)
                    .map_err(|e| WorkerError::ProcessingError(e.to_string()))?,
                relationship.strength,
                relationship.metadata,
                chrono::Utc::now()
            )
            .execute(&self.pg_pool)
            .await
            .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
        }
        
        Ok(())
    }
    
    fn get_collection_for_type(&self, entity_type: &str) -> String {
        match entity_type {
            "task" => "kanban_tasks".to_string(),
            "page" => "wiki_pages".to_string(),
            "memory" => "memory_nodes".to_string(),
            _ => "cross_references".to_string(),
        }
    }
    
    async fn get_entity_vector(
        &self, 
        entity_id: &str, 
        collection: &str
    ) -> Result<Vec<f32>, WorkerError> {
        // This would need to be implemented based on how vectors are stored
        // For now, returning a placeholder
        Err(WorkerError::ProcessingError("Not implemented".to_string()))
    }
}

#[derive(Debug)]
struct EntityReference {
    id: String,
    entity_type: String,
    context: String,
}

#[async_trait::async_trait]
impl Worker for RelationshipAnalysisWorker {
    type Message = RelationshipAnalysisRequest;
    
    fn name(&self) -> &'static str {
        "relationship_analysis"
    }
    
    fn subjects(&self) -> Vec<String> {
        vec![
            "relationship.analyze.request".to_string(),
            "mcp.*.created".to_string(),
            "mcp.*.updated".to_string(),
        ]
    }
    
    #[instrument(skip(self, message))]
    async fn process_message(&self, message: Self::Message) -> Result<(), WorkerError> {
        info!("Analyzing relationships for entity: {}", message.data.entity_id);
        
        let mut all_relationships = Vec::new();
        
        // Find semantic relationships
        let semantic_rels = self.find_semantic_relationships(&message.data).await?;
        all_relationships.extend(semantic_rels);
        
        // Find cross-references
        let cross_refs = self.find_cross_references(&message.data).await?;
        all_relationships.extend(cross_refs);
        
        // Persist relationships
        self.persist_relationships(all_relationships).await?;
        
        info!("Completed relationship analysis for entity: {}", message.data.entity_id);
        
        Ok(())
    }
}
```

## Data Synchronization Worker

🔗 **Related**: [Backend Integration](BACKEND_INTEGRATION.md) | [Error Handling Flows](DATA_FLOW_DIAGRAMS.md#8-error-handling-and-recovery-flow)

```rust
// src/workers/data_sync.rs
use crate::{Worker, WorkerError, WorkerConfig};
use sqlx::PgPool;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
pub struct DataSyncRequest {
    pub message_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub source: String,
    pub data: DataSyncData,
}

#[derive(Debug, Deserialize)]
pub struct DataSyncData {
    pub sync_type: SyncType,
    pub entity_ids: Vec<String>,
    pub context: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncType {
    IncrementalSync,
    FullSync,
    ConflictResolution,
    DataValidation,
}

pub struct DataSyncWorker {
    pg_pools: HashMap<String, PgPool>,
    config: WorkerConfig,
}

impl DataSyncWorker {
    pub async fn new(config: WorkerConfig) -> Result<Self, WorkerError> {
        let mut pg_pools = HashMap::new();
        
        // Connect to main database
        let main_pool = PgPool::connect(&config.postgres_url).await
            .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
        pg_pools.insert("main".to_string(), main_pool);
        
        Ok(Self { pg_pools, config })
    }
    
    #[instrument(skip(self, data))]
    async fn perform_incremental_sync(&self, data: &DataSyncData) -> Result<(), WorkerError> {
        info!("Performing incremental sync for {} entities", data.entity_ids.len());
        
        let main_pool = self.pg_pools.get("main")
            .ok_or_else(|| WorkerError::DatabaseError("Main pool not found".to_string()))?;
        
        // Update search indexes, cache invalidation, etc.
        for entity_id in &data.entity_ids {
            self.sync_entity_indexes(entity_id).await?;
        }
        
        Ok(())
    }
    
    async fn sync_entity_indexes(&self, entity_id: &str) -> Result<(), WorkerError> {
        // Implementation for syncing search indexes, cache updates, etc.
        info!("Syncing indexes for entity: {}", entity_id);
        Ok(())
    }
    
    #[instrument(skip(self, data))]
    async fn validate_data_consistency(&self, data: &DataSyncData) -> Result<(), WorkerError> {
        info!("Validating data consistency for {} entities", data.entity_ids.len());
        
        // Check for orphaned relationships, missing references, etc.
        let main_pool = self.pg_pools.get("main")
            .ok_or_else(|| WorkerError::DatabaseError("Main pool not found".to_string()))?;
        
        let orphaned_relationships = sqlx::query!(
            r#"
            SELECT r.id, r.source_id, r.target_id
            FROM relationships r
            LEFT JOIN tasks t1 ON r.source_id = t1.id::text
            LEFT JOIN wiki_pages w1 ON r.source_id = w1.id::text  
            LEFT JOIN memory_nodes m1 ON r.source_id = m1.id::text
            WHERE t1.id IS NULL AND w1.id IS NULL AND m1.id IS NULL
            "#
        )
        .fetch_all(main_pool)
        .await
        .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
        
        if !orphaned_relationships.is_empty() {
            warn!("Found {} orphaned relationships", orphaned_relationships.len());
            
            // Clean up orphaned relationships
            for rel in orphaned_relationships {
                sqlx::query!("DELETE FROM relationships WHERE id = $1", rel.id)
                    .execute(main_pool)
                    .await
                    .map_err(|e| WorkerError::DatabaseError(e.to_string()))?;
            }
        }
        
        Ok(())
    }
}

#[async_trait::async_trait]
impl Worker for DataSyncWorker {
    type Message = DataSyncRequest;
    
    fn name(&self) -> &'static str {
        "data_sync"
    }
    
    fn subjects(&self) -> Vec<String> {
        vec![
            "data.sync.request".to_string(),
            "data.validate.request".to_string(),
        ]
    }
    
    #[instrument(skip(self, message))]
    async fn process_message(&self, message: Self::Message) -> Result<(), WorkerError> {
        match message.data.sync_type {
            SyncType::IncrementalSync => {
                self.perform_incremental_sync(&message.data).await?;
            }
            SyncType::DataValidation => {
                self.validate_data_consistency(&message.data).await?;
            }
            _ => {
                warn!("Unsupported sync type: {:?}", message.data.sync_type);
            }
        }
        
        Ok(())
    }
}
```

## Worker Deployment

### Cargo.toml

```toml
[package]
name = "mcp-workers"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "vector-indexing-worker"
path = "src/bin/vector_indexing.rs"

[[bin]]
name = "relationship-analysis-worker"
path = "src/bin/relationship_analysis.rs"

[[bin]]
name = "data-sync-worker"
path = "src/bin/data_sync.rs"

[dependencies]
tokio = { version = "1.0", features = ["full"] }
async-nats = "0.33"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
sqlx = { version = "0.7", features = ["postgres", "runtime-tokio-rustls", "uuid", "chrono"] }
qdrant-client = "1.7"
openai-api-rs = "0.4"
uuid = { version = "1.0", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
tracing = "0.1"
tracing-subscriber = "0.3"
async-trait = "0.1"
regex = "1.0"
```

### Worker Binaries

```rust
// src/bin/vector_indexing.rs
use mcp_workers::{WorkerRunner, WorkerConfig};
use mcp_workers::workers::VectorIndexingWorker;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::init();
    
    let config = WorkerConfig {
        nats_url: std::env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string()),
        postgres_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
        qdrant_url: std::env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6333".to_string()),
        openai_api_key: std::env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY must be set"),
        batch_size: 10,
        retry_attempts: 3,
        retry_delay_ms: 1000,
    };
    
    let nats_client = async_nats::connect(&config.nats_url).await?;
    
    let worker = VectorIndexingWorker::new(config.clone())?;
    let runner = WorkerRunner::new(worker, nats_client, config);
    
    runner.run().await?;
    
    Ok(())
}
```

### Docker Configuration

```dockerfile
# Dockerfile.vector-worker
FROM rust:1.75 as builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ src/

RUN cargo build --release --bin vector-indexing-worker

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/vector-indexing-worker /usr/local/bin/

CMD ["vector-indexing-worker"]
```

This Rust worker architecture provides high-performance, scalable background processing with proper error handling, retry logic, and observability built-in.

## Next Steps

- 📋 **MCP Integration**: [MCP Server Details](MCP_SERVER_DETAILS.md)
- ⚛️ **Frontend Connection**: [Web Client Architecture](WEB_CLIENT_ARCHITECTURE.md)
- 📊 **Process Flows**: [Data Flow Diagrams](DATA_FLOW_DIAGRAMS.md)
- 🔌 **API Endpoints**: [API Specifications](API_SPECIFICATIONS.md)