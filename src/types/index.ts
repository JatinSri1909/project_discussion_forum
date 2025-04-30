export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  project_id: string;
  created_at: string;
}

export interface Post {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  content?: string;
  content_type: 'text' | 'code' | 'link' | 'poll';
  categories: string[];
  created_at: string;
  is_pinned: boolean;
  upvotes: number;
  downvotes: number;
  score: number;
}

export interface Attachment {
  id: string;
  post_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  attachment_type: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id?: string;
  author_id: string;
  content: string;
  content_type: string;
  depth: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
}

export interface Vote {
  id: string;
  user_id: string;
  entity_type: 'post' | 'comment';
  entity_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface Mention {
  id: string;
  entity_type: 'post' | 'comment';
  entity_id: string;
  mentioned_user_id: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  message: string;
  type: 'mention' | 'comment_reply';
  is_read: boolean;
  created_at: string;
}

export interface Reputation {
  user_id: string;
  score: number;
}

// API Request Types
export interface CreatePostRequest {
  projectId: string;
  title: string;
  content?: string;
  contentType: 'text' | 'code' | 'link' | 'poll';
  codeContent?: {
    language: string;
    code: string;
  };
  linkContent?: {
    url: string;
    description: string;
  };
  categories: string[];
  mentions?: string[];
  clientPostId: string;
  attachments?: {
    attachmentType: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }[];
}

export interface CreateCommentRequest {
  postId: string;
  parentCommentId?: string;
  content: string;
  contentType: 'text' | 'code';
  codeContent?: {
    language: string;
    code: string;
  };
  mentions?: string[];
  clientCommentId: string;
}

export interface VoteRequest {
  entityType: 'post' | 'comment';
  entityId: string;
  voteType: 'upvote' | 'downvote';
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  sortBy?: 'new' | 'top' | 'controversial' | 'trending';
  timeRange?: 'day' | 'week' | 'month' | 'year' | 'all';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}