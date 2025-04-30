-- Add trending score column to posts
ALTER TABLE posts
ADD COLUMN trending_score FLOAT DEFAULT 0;

-- Create indexes for common queries and sorting
CREATE INDEX idx_posts_project_created ON posts (project_id, created_at DESC);
CREATE INDEX idx_posts_score ON posts (score DESC);
CREATE INDEX idx_posts_trending ON posts (trending_score DESC);
CREATE INDEX idx_comments_post_created ON comments (post_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments (parent_comment_id);
CREATE INDEX idx_votes_entity ON votes (entity_type, entity_id);
CREATE INDEX idx_votes_user ON votes (user_id, entity_type, entity_id);
CREATE INDEX idx_categories_project ON categories (project_id);

-- Add GiST index for efficient text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_posts_title_trgm ON posts USING GiST (title gist_trgm_ops);
CREATE INDEX idx_posts_content_trgm ON posts USING GiST (content gist_trgm_ops);

-- Create a function to periodically refresh trending scores
CREATE OR REPLACE FUNCTION refresh_trending_scores_job()
RETURNS void AS $$
BEGIN
  -- Only update posts from the last week to limit processing
  UPDATE posts
  SET trending_score = calculate_trending_score(upvotes, downvotes, created_at)
  WHERE created_at > NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule the trending score refresh (requires pg_cron extension)
-- This needs to be run by a superuser:
-- SELECT cron.schedule('refresh_trending_scores', '*/15 * * * *', 'SELECT refresh_trending_scores_job();');