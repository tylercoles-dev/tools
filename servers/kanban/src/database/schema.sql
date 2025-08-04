-- Kanban Board Database Schema
-- Supports PostgreSQL

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    color VARCHAR(7) DEFAULT '#6366f1'
);

-- Columns table (represents swim lanes like "To Do", "In Progress", "Done")
CREATE TABLE IF NOT EXISTS columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#64748b',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    column_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to VARCHAR(255),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#64748b',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Card tags junction table
CREATE TABLE IF NOT EXISTS card_tags (
    card_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (card_id, tag_id),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Custom Fields table (board-level field definitions)
CREATE TABLE IF NOT EXISTS custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'dropdown', 'checkbox', 'multi_select')),
    is_required BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    options TEXT, -- JSON string for dropdown/multi_select options
    validation_rules TEXT, -- JSON string for validation rules
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    UNIQUE(board_id, name)
);

-- Card Custom Field Values table
CREATE TABLE IF NOT EXISTS card_custom_field_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    custom_field_id INTEGER NOT NULL,
    value TEXT, -- Stored as text, parsed based on field_type
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
    UNIQUE(card_id, custom_field_id)
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_date DATE,
    position INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Card Milestones junction table
CREATE TABLE IF NOT EXISTS card_milestones (
    card_id INTEGER NOT NULL,
    milestone_id INTEGER NOT NULL,
    PRIMARY KEY (card_id, milestone_id),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE
);

-- Card Subtasks table (hierarchical todo lists)
CREATE TABLE IF NOT EXISTS card_subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    parent_subtask_id INTEGER, -- For nested subtasks
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    position INTEGER NOT NULL DEFAULT 0,
    assigned_to VARCHAR(255),
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_subtask_id) REFERENCES card_subtasks(id) ON DELETE CASCADE
);

-- Card Links table (relationships between cards)
CREATE TABLE IF NOT EXISTS card_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_card_id INTEGER NOT NULL,
    target_card_id INTEGER NOT NULL,
    link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('blocks', 'relates_to', 'duplicate', 'parent_child')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    FOREIGN KEY (source_card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (target_card_id) REFERENCES cards(id) ON DELETE CASCADE,
    UNIQUE(source_card_id, target_card_id, link_type)
);

-- Time Entries table (time tracking)
CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    user_name VARCHAR(255),
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_minutes INTEGER, -- Calculated or manually entered
    is_billable BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Add time estimate fields to cards table
ALTER TABLE cards ADD COLUMN estimated_hours DECIMAL(10,2);
ALTER TABLE cards ADD COLUMN actual_hours DECIMAL(10,2);

-- Card Activities table (activity tracking and audit log)
CREATE TABLE IF NOT EXISTS card_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL,
    board_id INTEGER NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('created', 'updated', 'moved', 'assigned', 'commented', 'tagged', 'archived', 'restored', 'linked', 'time_logged')),
    user_id VARCHAR(255),
    user_name VARCHAR(255),
    details TEXT, -- JSON string containing action-specific details
    old_values TEXT, -- JSON string of previous values (for updates)
    new_values TEXT, -- JSON string of new values (for updates)
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Insert default data only if tables are empty
INSERT OR IGNORE INTO boards (id, name, description, color) VALUES 
(1, 'Sample Project', 'A sample kanban board to get started', '#6366f1'),
(2, 'Personal Tasks', 'Personal task management board', '#10b981');

INSERT OR IGNORE INTO columns (id, board_id, name, position, color) VALUES 
(1, 1, 'To Do', 0, '#ef4444'),
(2, 1, 'In Progress', 1, '#f59e0b'),
(3, 1, 'Review', 2, '#3b82f6'),
(4, 1, 'Done', 3, '#10b981'),
(5, 2, 'Backlog', 0, '#6b7280'),
(6, 2, 'Active', 1, '#8b5cf6'),
(7, 2, 'Completed', 2, '#10b981');

INSERT OR IGNORE INTO tags (id, name, color) VALUES
(1, 'urgent', '#ef4444'),
(2, 'feature', '#3b82f6'),
(3, 'bug', '#f59e0b'),
(4, 'enhancement', '#10b981'),
(5, 'documentation', '#8b5cf6');

INSERT OR IGNORE INTO cards (id, board_id, column_id, title, description, position, priority, assigned_to) VALUES
(1, 1, 1, 'Setup project structure', 'Initialize the kanban board project with proper folder structure', 0, 'high', 'Developer'),
(2, 1, 1, 'Design database schema', 'Create tables for boards, columns, cards, and tags', 1, 'high', 'Developer'),
(3, 1, 2, 'Implement MCP server', 'Build the MCP server with tools and resources for kanban management', 0, 'high', 'Developer'),
(4, 1, 3, 'Create React frontend', 'Build a basic web UI for managing the kanban board', 0, 'medium', 'Frontend Dev'),
(5, 2, 5, 'Learn MCP protocol', 'Study the Model Context Protocol specification', 0, 'medium', 'Self'),
(6, 2, 6, 'Practice TypeScript', 'Improve TypeScript skills for better development', 0, 'low', 'Self');

INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES
(1, 2), -- Setup project structure -> feature
(2, 2), -- Design database schema -> feature  
(3, 2), -- Implement MCP server -> feature
(4, 2), -- Create React frontend -> feature
(5, 5), -- Learn MCP protocol -> documentation
(6, 4); -- Practice TypeScript -> enhancement