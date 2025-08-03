/**
 * Indexes and optimizations migration
 * Adds database indexes for better query performance across all tables
 */

import { Kysely, sql } from 'kysely';
import type { Migration } from 'kysely';
import { logger } from '../utils/logger.js';

export const addIndexesAndOptimizations: Migration = {
  async up(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 005_indexes_and_optimizations (up)');

    // ===================
    // KANBAN INDEXES
    // ===================

    // Boards indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_boards_updated_at ON boards(updated_at)`.execute(db);

    // Columns indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(board_id, position)`.execute(db);

    // Cards indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_board_id ON cards(board_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_assigned_to ON cards(assigned_to)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_priority ON cards(priority)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(column_id, position)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON cards(updated_at)`.execute(db);

    // Tags indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)`.execute(db);

    // Card tags indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_tags_tag_id ON card_tags(tag_id)`.execute(db);

    // Comments indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)`.execute(db);

    // ===================
    // KANBAN EXTENDED FEATURES INDEXES
    // ===================

    // Custom fields indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_fields_board_id ON custom_fields(board_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_custom_fields_type ON custom_fields(field_type)`.execute(db);

    // Card custom field values indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_card_custom_field_values_card_id ON card_custom_field_values(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_custom_field_values_field_id ON card_custom_field_values(custom_field_id)`.execute(db);

    // Milestones indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_milestones_board_id ON milestones(board_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_milestones_is_completed ON milestones(is_completed)`.execute(db);

    // Card milestones indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_card_milestones_card_id ON card_milestones(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_milestones_milestone_id ON card_milestones(milestone_id)`.execute(db);

    // Card subtasks indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_card_subtasks_card_id ON card_subtasks(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_subtasks_parent_id ON card_subtasks(parent_subtask_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_subtasks_assigned_to ON card_subtasks(assigned_to)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_subtasks_due_date ON card_subtasks(due_date)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_subtasks_is_completed ON card_subtasks(is_completed)`.execute(db);

    // Card links indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_card_links_source_card_id ON card_links(source_card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_links_target_card_id ON card_links(target_card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_links_link_type ON card_links(link_type)`.execute(db);

    // Time entries indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_card_id ON time_entries(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_user_name ON time_entries(user_name)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_time_entries_is_billable ON time_entries(is_billable)`.execute(db);

    // Card activities indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_card_activities_card_id ON card_activities(card_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_activities_board_id ON card_activities(board_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_activities_action_type ON card_activities(action_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_activities_user_id ON card_activities(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_card_activities_timestamp ON card_activities(timestamp)`.execute(db);

    // ===================
    // WIKI INDEXES
    // ===================

    // Pages indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON pages(parent_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_is_published ON pages(is_published)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_created_by ON pages(created_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_updated_by ON pages(updated_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_created_at ON pages(created_at)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_updated_at ON pages(updated_at)`.execute(db);

    // Categories indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`.execute(db);

    // Page categories indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_categories_page_id ON page_categories(page_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_page_categories_category_id ON page_categories(category_id)`.execute(db);

    // Wiki tags indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_tags_name ON wiki_tags(name)`.execute(db);

    // Page tags indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_tags_page_id ON page_tags(page_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_page_tags_tag_id ON page_tags(tag_id)`.execute(db);

    // Page links indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_links_source_page_id ON page_links(source_page_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_page_links_target_page_id ON page_links(target_page_id)`.execute(db);

    // Wiki attachments indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_attachments_page_id ON wiki_attachments(page_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_attachments_mime_type ON wiki_attachments(mime_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_attachments_uploaded_by ON wiki_attachments(uploaded_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_attachments_uploaded_at ON wiki_attachments(uploaded_at)`.execute(db);

    // Page history indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_page_history_page_id ON page_history(page_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_page_history_changed_by ON page_history(changed_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_page_history_created_at ON page_history(created_at)`.execute(db);

    // Wiki comments indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_comments_page_id ON wiki_comments(page_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_comments_author ON wiki_comments(author)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_comments_parent_id ON wiki_comments(parent_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_wiki_comments_created_at ON wiki_comments(created_at)`.execute(db);

    // ===================
    // MEMORY INDEXES
    // ===================

    // Memories indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_content_hash ON memories(content_hash)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_created_by ON memories(created_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_updated_at ON memories(updated_at)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_vector_id ON memories(vector_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_access_count ON memories(access_count)`.execute(db);

    // Relationships indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_source_id ON relationships(source_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_target_id ON relationships(target_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_strength ON relationships(strength)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_relationships_bidirectional ON relationships(bidirectional)`.execute(db);

    // Concepts indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_concepts_type ON concepts(type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_concepts_confidence ON concepts(confidence)`.execute(db);

    // Memory concepts indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_concepts_memory_id ON memory_concepts(memory_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_concepts_concept_id ON memory_concepts(concept_id)`.execute(db);

    // Usage tracking indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_tracking_service ON usage_tracking(service)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_tracking_operation ON usage_tracking(operation)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_tracking_timestamp ON usage_tracking(timestamp)`.execute(db);

    // ===================
    // MEMORY GRAPH INDEXES
    // ===================

    // Memory merges indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_merges_primary_memory_id ON memory_merges(primary_memory_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_merges_created_by ON memory_merges(created_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_merges_created_at ON memory_merges(created_at)`.execute(db);

    // Memory snapshots indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_snapshots_memory_id ON memory_snapshots(memory_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_snapshots_version ON memory_snapshots(version)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_snapshots_created_at ON memory_snapshots(created_at)`.execute(db);

    // Concept hierarchies indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_concept_hierarchies_parent_id ON concept_hierarchies(parent_concept_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_concept_hierarchies_child_id ON concept_hierarchies(child_concept_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_concept_hierarchies_relationship_type ON concept_hierarchies(relationship_type)`.execute(db);

    // Memory clusters indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_clusters_cluster_type ON memory_clusters(cluster_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_clusters_created_by ON memory_clusters(created_by)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_clusters_cohesion_score ON memory_clusters(cohesion_score)`.execute(db);

    // Memory cluster memberships indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_cluster_memberships_memory_id ON memory_cluster_memberships(memory_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_cluster_memberships_cluster_id ON memory_cluster_memberships(cluster_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_cluster_memberships_score ON memory_cluster_memberships(membership_score)`.execute(db);

    // Context patterns indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_context_patterns_pattern_type ON context_patterns(pattern_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_context_patterns_frequency ON context_patterns(frequency)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_context_patterns_confidence ON context_patterns(confidence)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_context_patterns_last_seen ON context_patterns(last_seen)`.execute(db);

    // Memory context patterns indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_context_patterns_memory_id ON memory_context_patterns(memory_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_context_patterns_pattern_id ON memory_context_patterns(pattern_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_context_patterns_match_score ON memory_context_patterns(match_score)`.execute(db);

    // Memory access logs indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_access_logs_memory_id ON memory_access_logs(memory_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_access_logs_access_type ON memory_access_logs(access_type)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_access_logs_user_id ON memory_access_logs(user_id)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_access_logs_timestamp ON memory_access_logs(timestamp)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_access_logs_session_id ON memory_access_logs(session_id)`.execute(db);

    // Knowledge graph metrics indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_knowledge_graph_metrics_metric_name ON knowledge_graph_metrics(metric_name)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_knowledge_graph_metrics_timestamp ON knowledge_graph_metrics(calculation_timestamp)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_knowledge_graph_metrics_time_period ON knowledge_graph_metrics(time_period)`.execute(db);

    // ===================
    // COMPOSITE INDEXES FOR COMMON QUERIES
    // ===================

    // Kanban dashboard queries
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_board_column_position ON cards(board_id, column_id, position)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_assigned_priority ON cards(assigned_to, priority)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_cards_due_priority ON cards(due_date, priority) WHERE due_date IS NOT NULL`.execute(db);

    // Wiki navigation queries
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_parent_sort ON pages(parent_id, sort_order)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_pages_published_updated ON pages(is_published, updated_at)`.execute(db);

    // Memory query optimization
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_status_importance ON memories(status, importance)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_created_by_status ON memories(created_by, status)`.execute(db);

    // Time-based analytics queries
    await sql`CREATE INDEX IF NOT EXISTS idx_card_activities_board_timestamp ON card_activities(board_id, timestamp)`.execute(db);
    await sql`CREATE INDEX IF NOT EXISTS idx_memory_access_logs_user_timestamp ON memory_access_logs(user_id, timestamp)`.execute(db);

    logger.info('Migration 005_indexes_and_optimizations completed successfully');
  },

  async down(db: Kysely<any>): Promise<void> {
    logger.info('Running migration: 005_indexes_and_optimizations (down)');

    // Note: Dropping all indexes individually would be very verbose
    // In a real scenario, you might want to be more selective about which indexes to drop
    // For this rollback, we'll drop the most important composite indexes and let the rest remain
    
    const compositIndexes = [
      'idx_cards_board_column_position',
      'idx_cards_assigned_priority', 
      'idx_cards_due_priority',
      'idx_pages_parent_sort',
      'idx_pages_published_updated',
      'idx_memories_status_importance',
      'idx_memories_created_by_status',
      'idx_card_activities_board_timestamp',
      'idx_memory_access_logs_user_timestamp'
    ];

    for (const index of compositIndexes) {
      try {
        await sql`DROP INDEX IF EXISTS ${sql.raw(index)}`.execute(db);
      } catch (error) {
        logger.warn(`Could not drop index ${index}:`, error);
      }
    }

    logger.info('Migration 005_indexes_and_optimizations rollback completed (selective index removal)');
  }
};