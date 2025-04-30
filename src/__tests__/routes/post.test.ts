import request from 'supertest';
import { supabase } from '../../lib/supabase';
import app from '../../app';
import { CreatePostRequest } from '../../types';
import { PostgrestBuilder, PostgrestFilterBuilder } from '@supabase/postgrest-js';

// Mock Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  }
}));

describe('Post Routes', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    isAdmin: false
  };

  const mockPost = {
    id: 'test-post-id',
    title: 'Test Post',
    content: 'Test content',
    author_id: mockUser.id,
    project_id: 'test-project-id',
    content_type: 'text',
    categories: ['test-category'],
    created_at: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
    score: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const postData: CreatePostRequest = {
        projectId: 'test-project-id',
        title: 'Test Post',
        content: 'Test content',
        contentType: 'text',
        categories: ['test-category'],
        clientPostId: 'client-1'
      };

      ((supabase.from('posts').insert([postData]).single() as unknown) as jest.Mock).mockResolvedValueOnce({
        data: mockPost,
        error: null
      });

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer test-token')
        .send(postData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: postData.title,
        content: postData.content
      });
    });

    it('should return 400 for invalid post data', async () => {
      const invalidData = {
        // Missing required fields
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', 'Bearer test-token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/posts/project/:projectId', () => {
    it('should retrieve posts for a project', async () => {
      ((supabase
        .from('posts')
        .select('*')
        .eq('project_id', 'test-project-id')
        .order('created_at', { ascending: false })
        .limit(20) as unknown) as jest.Mock)
        .mockResolvedValueOnce({
          data: [mockPost],
          error: null
        });

      const response = await request(app)
        .get('/api/posts/project/test-project-id')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.posts).toHaveLength(1);
      expect(response.body.data.posts[0]).toMatchObject({
        id: mockPost.id,
        title: mockPost.title
      });
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should retrieve a single post with comments', async () => {
      ((supabase
        .from('posts')
        .select('*')
        .eq('id', mockPost.id)
        .single() as unknown) as jest.Mock)
        .mockResolvedValueOnce({
          data: mockPost,
          error: null
        });

      ((supabase
        .from('comments')
        .select('*')
        .eq('post_id', mockPost.id)
        .order('created_at', { ascending: true }) as unknown) as jest.Mock)
        .mockResolvedValueOnce({
          data: [],
          error: null
        });

      const response = await request(app)
        .get(`/api/posts/${mockPost.id}`)
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.post).toMatchObject({
        id: mockPost.id,
        title: mockPost.title
      });
      expect(response.body.data.comments).toEqual([]);
    });

    it('should return 404 for non-existent post', async () => {
      ((supabase
        .from('posts')
        .select('*')
        .eq('id', 'non-existent-id')
        .single() as unknown) as jest.Mock)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' }
        });

      const response = await request(app)
        .get('/api/posts/non-existent-id')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('POST_NOT_FOUND');
    });
  });
});