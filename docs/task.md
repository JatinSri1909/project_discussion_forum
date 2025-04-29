# Task 3: Project Discussion Forum System

## Objective
Design and implement a comprehensive discussion forum system for projects that enables structured conversations, knowledge sharing, and community engagement with features similar to Reddit including topic categorization, upvoting, threading, and content moderation.

## Background & Context
Effective knowledge sharing and discussion are essential for collaborative learning and project development. Before beginning this task, you must explore our projects section at https://app.hidevs.xyz/projects to understand the current implementation and identify opportunities for forum integration.

Key challenges to address:
- Project-specific discussions are not organized by topics or categories
- Users cannot easily find relevant conversations or knowledge
- Technical discussions lack visibility and engagement metrics
- There's no way to highlight valuable contributions through voting

## Forum System Requirements
Your implementation should support multiple discussion patterns similar to Reddit:

### Required Discussion Features:
- Project Forums: Separate discussion space for each project
- Categories/Tags: Topic organization within project forums
- Posts & Threads: Hierarchical discussion structure
- Voting System: Upvote/downvote for posts and comments
- Sorting Options: Sort by new/top/controversial/trending
- Rich Content: Support for code snippets, images, and links
- User Recognition: Reputation and contribution tracking

These features should be integrated into a cohesive discussion experience that promotes quality content and engagement.

## Expected Input/Output

### Post Creation Endpoint

**Input Requirements:**
```json
{
  "projectId": "proj-478923",
  "title": "Best practices for implementing RAG systems",
  "content": "I've been working on implementing a RAG system and wanted to share some best practices I've discovered...",
  "contentType": "text|code|link|poll",
  "codeContent": {
    "language": "javascript",
    "code": "function retrieveDocuments(query, k=5) {\n  const embeddings = getEmbeddings(query);\n  return vectorStore.similaritySearch(embeddings, k);\n}"
  },
  "linkContent": {
    "url": "https://example.com/rag-systems-guide",
    "description": "Comprehensive guide on implementing RAG systems"
  },
  "categories": ["implementation", "best-practices", "architecture"],
  "mentions": ["user-78123", "user-89234"],
  "clientPostId": "client-post-12345",
  "attachments": [
    {
      "attachmentType": "image",
      "fileUrl": "https://temp-upload.example.com/image1.jpg",
      "fileName": "rag-architecture-diagram.jpg",
      "fileSize": 256000
    }
  ]
}
```

**Expected Output:**
```json
{
  "success": true,
  "post": {
    "id": "post-60f7d45e2c89a73c",
    "projectId": "proj-478923",
    "title": "Best practices for implementing RAG systems",
    "content": "I've been working on implementing a RAG system and wanted to share some best practices I've discovered...",
    "contentType": "text",
    "codeContent": {
      "language": "javascript",
      "code": "function retrieveDocuments(query, k=5) {\n  const embeddings = getEmbeddings(query);\n  return vectorStore.similaritySearch(embeddings, k);\n}"
    },
    "author": {
      "id": "user-60f7d111",
      "username": "john_developer",
      "avatar": "/avatars/john-dev.jpg",
      "reputation": 1250
    },
    "categories": ["implementation", "best-practices", "architecture"],
    "createdAt": "2025-04-27T10:25:30Z",
    "upvotes": 1,
    "downvotes": 0,
    "commentCount": 0,
    "score": 1,
    "attachments": [
      {
        "id": "attach-789123",
        "attachmentType": "image",
        "fileUrl": "/uploads/posts/post-60f7d45e2c89a73c/rag-architecture-diagram.jpg",
        "fileName": "rag-architecture-diagram.jpg",
        "fileSize": 256000
      }
    ],
    "isPinned": false,
    "clientPostId": "client-post-12345"
  },
  "notifications": [
    {
      "type": "mention",
      "recipients": ["user-78123", "user-89234"],
      "message": "You were mentioned in a post: Best practices for implementing RAG systems"
    }
  ]
}
```

### Comment Creation Endpoint

**Input Requirements:**
```json
{
  "postId": "post-60f7d45e2c89a73c",
  "parentCommentId": "comment-60f8a123", // null for top-level comments
  "content": "Great point about vector stores! I've found that FAISS works particularly well for RAG implementations.",
  "contentType": "text|code",
  "codeContent": {
    "language": "python",
    "code": "from langchain.vectorstores import FAISS\n\nvector_store = FAISS.from_documents(documents, embeddings)"
  },
  "mentions": ["user-12345"],
  "clientCommentId": "client-comment-67890"
}
```

**Expected Output:**
```json
{
  "success": true,
  "comment": {
    "id": "comment-60f8b789",
    "postId": "post-60f7d45e2c89a73c",
    "parentCommentId": "comment-60f8a123",
    "content": "Great point about vector stores! I've found that FAISS works particularly well for RAG implementations.",
    "contentType": "code",
    "codeContent": {
      "language": "python",
      "code": "from langchain.vectorstores import FAISS\n\nvector_store = FAISS.from_documents(documents, embeddings)"
    },
    "author": {
      "id": "user-89234",
      "username": "ml_enthusiast",
      "avatar": "/avatars/ml-enthusiast.jpg",
      "reputation": 875
    },
    "createdAt": "2025-04-27T11:42:15Z",
    "upvotes": 1,
    "downvotes": 0,
    "childCommentCount": 0,
    "score": 1,
    "depth": 1,
    "clientCommentId": "client-comment-67890"
  },
  "threadUpdate": {
    "totalComments": 8,
    "rootCommentCount": 3
  },
  "notifications": [
    {
      "type": "comment_reply",
      "recipients": ["user-60f7d111"],
      "message": "ml_enthusiast replied to your comment"
    },
    {
      "type": "mention",
      "recipients": ["user-12345"],
      "message": "You were mentioned in a comment"
    }
  ]
}
```

### Forum View Endpoint

**Input:**
- Project ID in URL parameter
- Query parameters for pagination, sorting and filtering

**Expected Output:**
```json
{
  "projectForum": {
    "projectId": "proj-478923",
    "projectName": "AI-Powered Learning Assistant",
    "totalPosts": 87,
    "activeUsers": 42,
    "categories": [
      {
        "id": "cat-implementation",
        "name": "Implementation",
        "postCount": 35,
        "isFollowing": true
      },
      {
        "id": "cat-architecture",
        "name": "Architecture",
        "postCount": 23,
        "isFollowing": false
      },
      {
        "id": "cat-best-practices",
        "name": "Best Practices",
        "postCount": 29,
        "isFollowing": true
      }
    ],
    "pinnedPosts": [
      {
        "id": "post-60e5c123",
        "title": "Project Architecture Overview",
        "author": {
          "username": "project_lead",
          "reputation": 3420
        },
        "createdAt": "2025-04-15T08:30:00Z",
        "commentCount": 23,
        "upvotes": 47,
        "categories": ["architecture", "resources"]
      }
    ]
  },
  "posts": {
    "sortBy": "trending",
    "timeRange": "week",
    "total": 87,
    "page": 1,
    "pageSize": 25,
    "hasMore": true,
    "items": [
      {
        "id": "post-60f7d45e2c89a73c",
        "title": "Best practices for implementing RAG systems",
        "excerpt": "I've been working on implementing a RAG system and wanted to share some best practices I've discovered...",
        "author": {
          "id": "user-60f7d111",
          "username": "john_developer",
          "avatar": "/avatars/john-dev.jpg",
          "reputation": 1250
        },
        "createdAt": "2025-04-27T10:25:30Z",
        "commentCount": 8,
        "upvotes": 32,
        "downvotes": 3,
        "score": 29,
        "hasAttachments": true,
        "categories": ["implementation", "best-practices", "architecture"],
        "isUpvoted": true,
        "isDownvoted": false,
        "trending": {
          "velocityScore": 0.85,
          "recentComments": 5,
          "recentVotes": 12
        }
      }
      // Additional posts...
    ]
  },
  "userContext": {
    "reputation": 875,
    "canCreatePost": true,
    "postsInProject": 3,
    "commentsInProject": 12,
    "favoriteCategories": ["implementation", "best-practices"]
  },
  "activitySummary": {
    "todayPosts": 7,
    "weeklyTrend": "+15%",
    "mostActiveCategory": "implementation",
    "mostActiveTime": "afternoons"
  }
}
```

## Technical Requirements

### 1. Database Schema Design
Design comprehensive data models for the forum system including:
- Projects (with forum settings and metadata)
- Categories (with hierarchical relationships)
- Posts (with rich content support)
- Comments (with threading capabilities)
- Votes (with user tracking and anti-gaming mechanisms)
- User reputation and contribution tracking
- Content moderation flags and actions

Consider data modeling tradeoffs between normalization and query performance:
- Design efficient indexing strategies for text search and sorting
- Implement schema versioning for future extensibility
- Create optimized structures for vote aggregation and trending calculations
- Design for efficient pagination of large post and comment collections

### 2. API Endpoints Design

#### a. Post & Category Management
Develop endpoints for:
- Post creation, editing, deletion and moderation
- Category creation, management and subscription
- Post listing with flexible sorting and filtering
- Post pinning and announcement features
- Post analytics and engagement metrics

Implementation requirements:
- Implement proper validation for all operations
- Create cache-friendly response structures
- Design for efficient bulk operations
- Implement proper pagination strategies (cursor-based preferred)
- Support content drafts and scheduled publishing

#### b. Comment System
Implement endpoints for:
- Comment creation with rich content support
- Threaded replies with unlimited depth
- Comment editing and deletion
- Comment moderation (flagging, hiding, etc.)
- Thread collapsing and expansion
- Comment sorting (newest, oldest, most upvoted)

Design considerations:
- Design for efficient retrieval of comment threads
- Support lazy loading of nested comments
- Implement proper handling of deep comment chains
- Create notification triggers for new comments and replies

#### c. Voting & Reputation System
Create endpoints for:
- Upvoting and downvoting posts and comments
- Vote changing and withdrawal
- User reputation calculation and history
- Achievement tracking and badges
- Content sorting based on vote scores

Implementation details:
- Implement voting algorithms with anti-abuse protection
- Time decay factors for trending calculations
- Vote weight based on user reputation
- Detection of voting rings and manipulation
- Randomization factors to prevent echo chambers
- Apply rate limiting based on reputation and account age
- Create proper aggregation methods for trending calculations

### 3. Search & Discovery Features
Implement comprehensive search capabilities:
- Full-text search across posts and comments
- Filtering by categories, tags, authors, and date ranges
- Relevance ranking with recency factors
- Typeahead suggestions for search queries

Design discovery mechanisms:
- Related posts recommendations
- Trending topics identification
- User interest-based suggestions
- Category popularity tracking

Implement efficient indexing strategies:
- Inverted index for text search
- N-gram indexing for partial matching
- Vector embeddings for semantic search
- Faceted search capabilities

### 4. Security & Access Control
Design a comprehensive permissions system:
- Role-based access control (admin, moderator, member)
- Category-specific permissions
- Post and comment moderation capabilities
- Content visibility rules

Implement authentication requirements:
- Token validation for all operations
- Permission checks on all content operations
- Anti-CSRF protections

Create anti-abuse mechanisms:
- Rate limiting on post and comment creation
- Content filtering for inappropriate material
- Spam detection algorithms
- User reputation requirements for certain actions

Implement privacy features:
- Anonymous posting options
- Content deletion capabilities
- Data export functionality
- Audit logging for sensitive operations

### 5. Notification System
Design a notification architecture:
- In-app real-time notifications
- Email digests for subscribed forums
- Mention alerts for users
- Reply notifications
- Trending post alerts

Implement intelligent delivery:
- User preference respecting logic
- Notification grouping and batching
- Priority-based delivery
- Duplicate suppression
- Frequency capping to prevent notification fatigue

Create notification content management:
- Templates for different notification types
- Localization support
- Deep linking to relevant content

Implement tracking and analytics:
- Delivery confirmation
- Open/read tracking
- Engagement metrics

### 6. Advanced Features
Design and implement specialized functionality:
- Full-text search with highlighting
- Code snippet formatting with syntax highlighting
- Markdown or rich text support
- @mentions with auto-completion
- Polls and surveys within posts
- Content recommendations
- History tracking and revision comparison
- User blocking and content filtering

## Performance Requirements
Design for high scalability:
- Support for 50,000+ posts per project
- Handle 100,000+ comments across posts
- Maintain performance with 1,000+ concurrent users
- Process 10+ votes per second during peak activity

Implement performance optimizations:
- Content pagination with cursor-based navigation
- Efficient caching strategies for post and comment data
- Optimized query patterns for common listing operations
- Denormalization where appropriate for read performance
- Background processing for vote recalculation and trending

Create resource management strategies:
- Read replicas for high-traffic forums
- Separate databases for search indexes
- CDN integration for static content
- Rate limiting based on system load
- Graceful degradation under heavy load

## Testing Requirements
Implement comprehensive testing:
- Unit tests for vote calculation algorithms
- Integration tests for API endpoints
- Concurrency tests for simultaneous voting
- Performance testing under load
- Security testing for access controls

Create specialized test scenarios:
- Large thread navigation performance
- High-volume vote processing
- Content moderation workflows
- Full-text search accuracy
- Trending calculation accuracy

Document test coverage and results with benchmarks.

## Documentation Requirements
Provide comprehensive API documentation:
- RESTful endpoint specifications with examples
- Authentication and authorization requirements
- Error codes and resolution strategies
- Rate limiting and performance guidelines
- Webhook integration options for external systems

Create implementation guides:
- Forum configuration best practices
- Content moderation guidelines
- Vote algorithm explanations
- Performance optimization tips

Document system architecture:
- Component diagrams showing system interaction
- Data flow diagrams for key operations
- Scaling strategies for high-traffic forums
- Database schema documentation with indexing strategy
- Caching architecture and invalidation patterns

## Submission Guidelines
- Create your solution in a GitHub repository
- Implement the assigned task completely
- Include a comprehensive README with:
  - System design overview
  - Implementation decisions and reasoning
- Share the repository with us when complete
- Be prepared to discuss your solution in a technical interview