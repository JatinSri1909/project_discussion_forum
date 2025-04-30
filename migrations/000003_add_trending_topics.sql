-- Create function to get trending topics
CREATE OR REPLACE FUNCTION get_trending_topics(
  p_project_id UUID,
  p_interval TEXT
)
RETURNS TABLE (
  name TEXT,
  count BIGINT,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH post_categories AS (
    -- Unnest categories array to get individual categories
    SELECT 
      UNNEST(categories) as category_id,
      created_at,
      upvotes,
      downvotes
    FROM posts
    WHERE 
      project_id = p_project_id
      AND created_at >= NOW() - p_interval::INTERVAL
  ),
  category_stats AS (
    -- Calculate statistics per category
    SELECT 
      c.name,
      COUNT(*) as post_count,
      SUM(pc.upvotes - pc.downvotes) as total_score,
      SUM(pc.upvotes + pc.downvotes) as total_votes,
      MAX(pc.created_at) as latest_post
    FROM post_categories pc
    JOIN categories c ON c.id = pc.category_id::UUID
    GROUP BY c.name
  )
  SELECT
    cs.name,
    cs.post_count as count,
    -- Calculate trending score using post count, votes, and recency
    (
      (cs.total_score::FLOAT / GREATEST(cs.total_votes, 1)) * 
      cs.post_count * 
      (1.0 / (EXTRACT(EPOCH FROM (NOW() - cs.latest_post)) / 3600 + 2))^1.5
    ) as score
  FROM category_stats cs
  ORDER BY score DESC
  LIMIT 10;
END;
$$;

-- Create index to improve performance of trending topics query
CREATE INDEX idx_posts_project_categories ON posts USING GIN (categories)
WHERE created_at >= NOW() - INTERVAL '1 month';

-- Create function to refresh trending topics materialized view
CREATE MATERIALIZED VIEW trending_topics_cache AS
SELECT * FROM get_trending_topics(NULL, '1 week');

-- Create index on the materialized view
CREATE INDEX idx_trending_topics_score ON trending_topics_cache (score DESC);

-- Create function to refresh trending topics cache
CREATE OR REPLACE FUNCTION refresh_trending_topics_cache()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_topics_cache;
END;
$$;

-- Create a trigger to refresh trending topics when posts are modified
CREATE OR REPLACE FUNCTION refresh_trending_topics_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Schedule a refresh of trending topics
  PERFORM pg_notify('refresh_trending_topics', '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER posts_trending_topics_refresh
AFTER INSERT OR UPDATE OR DELETE ON posts
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_trending_topics_trigger();