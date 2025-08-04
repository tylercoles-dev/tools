export interface Page {
  id?: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  is_published?: boolean;
  parent_id?: string;
  sort_order?: number;
  
  // Related data
  categories?: Category[];
  tags?: Tag[];
  attachments?: Attachment[];
  children?: Page[];
  parent?: Page;
}

export interface Category {
  id?: string;
  name: string;
  description?: string;
  color?: string;
  created_at?: string;
}

export interface Tag {
  id?: string;
  name: string;
  color?: string;
  created_at?: string;
}

export interface PageLink {
  id?: string;
  source_page_id: string;
  target_page_id: string;
  link_text?: string;
  created_at?: string;
}

export interface Attachment {
  id?: string;
  page_id: string;
  filename: string;
  original_name: string;
  mime_type?: string;
  file_size?: number;
  file_path: string;
  created_at?: string;
}

export interface PageHistory {
  id?: string;
  page_id: string;
  title: string;
  content: string;
  summary?: string;
  changed_by?: string;
  change_reason?: string;
  created_at?: string;
}

export interface Comment {
  id?: string;
  page_id: string;
  content: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  parent_id?: string;
  
  // Related data
  replies?: Comment[];
}

export interface SearchResult {
  page: Page;
  excerpt?: string;
  score?: number;
  matches?: SearchMatch[];
}

export interface SearchMatch {
  field: 'title' | 'content' | 'summary';
  text: string;
  start: number;
  end: number;
}

export interface WikiStats {
  total_pages: number;
  published_pages: number;
  draft_pages: number;
  total_categories: number;
  total_tags: number;
  total_comments: number;
  total_attachments: number;
  recent_activity: RecentActivity[];
  popular_pages: PopularPage[];
}

export interface RecentActivity {
  type: 'page_created' | 'page_updated' | 'comment_added';
  page_id: string;
  page_title: string;
  author?: string;
  timestamp: string;
}

export interface PopularPage {
  page: Page;
  view_count?: number;
  link_count?: number;
}

export interface CreatePageRequest {
  title: string;
  content: string;
  summary?: string;
  category_ids?: string[];
  tag_names?: string[];
  is_published?: boolean;
  parent_id?: string;
  created_by?: string;
}

export interface UpdatePageRequest {
  title?: string;
  content?: string;
  summary?: string;
  category_ids?: string[];
  tag_names?: string[];
  is_published?: boolean;
  parent_id?: string;
  updated_by?: string;
  change_reason?: string;
}

export interface SearchRequest {
  query: string;
  category_id?: string;
  tag_names?: string[];
  include_drafts?: boolean;
  limit?: number;
  offset?: number;
}

export interface NavigationTree {
  page: Page;
  children: NavigationTree[];
  level: number;
}