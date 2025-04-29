### ✅ 3. Database Schema (PostgreSQL via Supabase)

```sql
-- Users are managed via Supabase Auth

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  project_id UUID REFERENCES projects(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  content_type TEXT CHECK (content_type IN ('text', 'code', 'link', 'poll')),
  categories UUID[],
  created_at TIMESTAMP DEFAULT now(),
  is_pinned BOOLEAN DEFAULT FALSE,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  score INT GENERATED ALWAYS AS (upvotes - downvotes) STORED
);

-- Attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  file_url TEXT,
  file_name TEXT,
  file_size INT,
  attachment_type TEXT
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES posts(id),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT,
  content_type TEXT,
  depth INT DEFAULT 0,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Votes
CREATE TABLE votes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('post', 'comment')),
  entity_id UUID NOT NULL,
  vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

-- Mentions
CREATE TABLE mentions (
  id UUID PRIMARY KEY,
  entity_type TEXT CHECK (entity_type IN ('post', 'comment')),
  entity_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('mention', 'comment_reply')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);

-- User reputation (simplified)
CREATE TABLE reputation (
  user_id UUID PRIMARY KEY,
  score INT DEFAULT 0
);
```

---

Would you like me to now:

- Render the **system architecture diagram**?
- Create API routes & controller structure next?
- Provide Supabase SQL migration or seed scripts?

Let me know what you’d like first.