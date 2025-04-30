-- Function to handle vote operations
CREATE OR REPLACE FUNCTION handle_vote(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_vote_type TEXT,
  p_existing_vote_type TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_name TEXT;
  v_author_id UUID;
  v_result JSONB;
BEGIN
  -- Determine table name based on entity type
  v_table_name := CASE p_entity_type
    WHEN 'post' THEN 'posts'
    WHEN 'comment' THEN 'comments'
    ELSE NULL
  END;

  -- Remove existing vote if any
  IF p_existing_vote_type IS NOT NULL THEN
    DELETE FROM votes
    WHERE user_id = p_user_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id;

    -- Revert the previous vote count
    EXECUTE format('
      UPDATE %I
      SET %I = %I - 1
      WHERE id = $1
      RETURNING author_id',
      v_table_name,
      p_existing_vote_type || 's',
      p_existing_vote_type || 's'
    ) USING p_entity_id INTO v_author_id;
  END IF;

  -- Insert new vote
  INSERT INTO votes (user_id, entity_type, entity_id, vote_type)
  VALUES (p_user_id, p_entity_type, p_entity_id, p_vote_type);

  -- Update vote count
  EXECUTE format('
    UPDATE %I
    SET %I = %I + 1
    WHERE id = $1
    RETURNING author_id, %I as upvotes, %I as downvotes',
    v_table_name,
    p_vote_type || 's',
    p_vote_type || 's',
    'upvotes',
    'downvotes'
  ) USING p_entity_id INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to remove a vote
CREATE OR REPLACE FUNCTION remove_vote(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_name TEXT;
  v_vote_type TEXT;
BEGIN
  -- Get the vote type before deleting
  SELECT vote_type INTO v_vote_type
  FROM votes
  WHERE user_id = p_user_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;

  IF v_vote_type IS NULL THEN
    RETURN;
  END IF;

  -- Determine table name based on entity type
  v_table_name := CASE p_entity_type
    WHEN 'post' THEN 'posts'
    WHEN 'comment' THEN 'comments'
    ELSE NULL
  END;

  -- Remove the vote
  DELETE FROM votes
  WHERE user_id = p_user_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id;

  -- Update vote count
  EXECUTE format('
    UPDATE %I
    SET %I = %I - 1
    WHERE id = $1',
    v_table_name,
    v_vote_type || 's',
    v_vote_type || 's'
  ) USING p_entity_id;
END;
$$;

-- Function to update user reputation
CREATE OR REPLACE FUNCTION update_reputation(
  p_user_id UUID,
  p_change INTEGER
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO reputation (user_id, score)
  VALUES (p_user_id, p_change)
  ON CONFLICT (user_id)
  DO UPDATE SET score = reputation.score + p_change;
END;
$$;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION get_project_stats(
  p_project_id UUID,
  p_date_filter TEXT DEFAULT ''
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH stats AS (
    SELECT
      COUNT(DISTINCT p.id) as total_posts,
      COUNT(DISTINCT c.id) as total_comments,
      COUNT(DISTINCT COALESCE(p.author_id, c.author_id)) as active_users,
      COALESCE(json_agg(
        json_build_object(
          'id', cat.id,
          'name', cat.name,
          'postCount', cat.post_count
        )
        ORDER BY cat.post_count DESC
        LIMIT 5
      ), '[]'::json) as top_categories
    FROM projects proj
    LEFT JOIN posts p ON p.project_id = proj.id
    LEFT JOIN comments c ON c.post_id = p.id
    LEFT JOIN (
      SELECT
        c.id,
        c.name,
        COUNT(p.id) as post_count
      FROM categories c
      LEFT JOIN posts p ON c.id = ANY(p.categories)
      WHERE c.project_id = p_project_id
      GROUP BY c.id, c.name
    ) cat ON TRUE
    WHERE proj.id = p_project_id
      AND (p_date_filter = '' OR (
        CASE WHEN p.id IS NOT NULL THEN p.created_at >= NOW() - INTERVAL '1' || p_date_filter
             WHEN c.id IS NOT NULL THEN c.created_at >= NOW() - INTERVAL '1' || p_date_filter
             ELSE FALSE
        END
      ))
  )
  SELECT jsonb_build_object(
    'totalPosts', total_posts,
    'totalComments', total_comments,
    'activeUsers', active_users,
    'topCategories', top_categories
  ) INTO v_result
  FROM stats;

  RETURN v_result;
END;
$$;

-- Function to calculate trending score (Wilson score with time decay)
CREATE OR REPLACE FUNCTION calculate_trending_score(
  upvotes INTEGER,
  downvotes INTEGER,
  created_at TIMESTAMP
) RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  n INTEGER;
  p FLOAT;
  z FLOAT = 1.96; -- 95% confidence
  age_in_hours FLOAT;
  gravity FLOAT = 1.8;
BEGIN
  n := upvotes + downvotes;
  
  IF n = 0 THEN
    RETURN 0;
  END IF;
  
  p := upvotes::FLOAT / n;
  
  -- Wilson score
  -- The following is the lower bound of the confidence interval
  -- https://www.evanmiller.org/how-not-to-sort-by-average-rating.html
  DECLARE wilson_score FLOAT;
  wilson_score := (
    (p + z*z/(2*n) - z * sqrt((p*(1-p) + z*z/(4*n))/n)) / (1 + z*z/n)
  );
  
  -- Time decay (similar to Hacker News algorithm)
  -- https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
  age_in_hours := EXTRACT(EPOCH FROM (now() - created_at)) / 3600;
  
  RETURN wilson_score * pow(0.5, age_in_hours / gravity);
END;
$$;

-- Function to refresh trending scores
CREATE OR REPLACE FUNCTION refresh_trending_scores() RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE posts
  SET trending_score = calculate_trending_score(upvotes, downvotes, created_at);
END;
$$;