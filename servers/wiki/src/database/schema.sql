-- Wiki Database Schema
-- Compatible with PostgreSQL

-- Pages table - stores wiki pages
CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    is_published BOOLEAN DEFAULT true,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE SET NULL
);

-- Categories table - for organizing pages
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Page categories junction table
CREATE TABLE IF NOT EXISTS page_categories (
    page_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    PRIMARY KEY (page_id, category_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Tags table - for flexible tagging
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#64748b',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Page tags junction table
CREATE TABLE IF NOT EXISTS page_tags (
    page_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (page_id, tag_id),
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Links table - tracks internal links between pages
CREATE TABLE IF NOT EXISTS page_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_page_id INTEGER NOT NULL,
    target_page_id INTEGER NOT NULL,
    link_text VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_page_id, target_page_id),
    FOREIGN KEY (source_page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (target_page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- Wiki attachments table - enhanced file attachment system
CREATE TABLE IF NOT EXISTS wiki_attachments (
    id TEXT PRIMARY KEY,
    page_id INTEGER NOT NULL,
    filename TEXT NOT NULL,         -- Storage filename (UUID-based)
    original_name TEXT NOT NULL,    -- User's original filename
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,     -- Relative path in storage
    thumbnail_path TEXT,            -- For image thumbnails
    description TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- Page history table - version control for pages
CREATE TABLE IF NOT EXISTS page_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    changed_by VARCHAR(255),
    change_reason VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- Comments table - for page discussions
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    parent_id INTEGER,
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Full-text search table (SQLite FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    title, 
    content, 
    summary,
    content_row_id=pages.id
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages(is_published);
CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at);
CREATE INDEX IF NOT EXISTS idx_page_links_source ON page_links(source_page_id);
CREATE INDEX IF NOT EXISTS idx_page_links_target ON page_links(target_page_id);
CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_attachments_page_id ON wiki_attachments(page_id);
CREATE INDEX IF NOT EXISTS idx_wiki_attachments_mime_type ON wiki_attachments(mime_type);
CREATE INDEX IF NOT EXISTS idx_page_history_page ON page_history(page_id);

-- Triggers for updating updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_pages_updated_at 
    AFTER UPDATE ON pages
    BEGIN
        UPDATE pages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_comments_updated_at 
    AFTER UPDATE ON comments
    BEGIN
        UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Triggers for maintaining FTS index
CREATE TRIGGER IF NOT EXISTS pages_fts_insert AFTER INSERT ON pages
    BEGIN
        INSERT INTO pages_fts(rowid, title, content, summary) 
        VALUES (NEW.id, NEW.title, NEW.content, NEW.summary);
    END;

CREATE TRIGGER IF NOT EXISTS pages_fts_update AFTER UPDATE ON pages
    BEGIN
        UPDATE pages_fts 
        SET title = NEW.title, content = NEW.content, summary = NEW.summary
        WHERE rowid = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS pages_fts_delete AFTER DELETE ON pages
    BEGIN
        DELETE FROM pages_fts WHERE rowid = OLD.id;
    END;