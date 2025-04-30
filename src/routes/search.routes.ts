import { Router, Response } from 'express';
import { query } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabase } from '../lib/supabase';
import { ApiResponse, Post, Comment } from '../types';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

interface SearchResult {
  posts: Post[];
  comments: Comment[];
}

router.get('/', validate([
  query('q').notEmpty().trim(),
  query('projectId').optional().isUUID(),
  query('type').optional().isIn(['post', 'comment', 'all']),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 })
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const searchQuery = req.query.q as string;
      const projectId = req.query.projectId as string;
      const type = (req.query.type as string) || 'all';
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = parseInt(req.query.offset as string) || 0;

      let postResults: Post[] = [];
      let commentResults: Comment[] = [];

      // Search posts
      if (type === 'post' || type === 'all') {
        const postQuery = supabase
          .from('posts')
          .select(`
            *,
            author:author_id (
              id,
              username,
              avatar
            )
          `)
          .textSearch('title', searchQuery, {
            type: 'websearch',
            config: 'english'
          })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (projectId) {
          postQuery.eq('project_id', projectId);
        }

        const { data: posts, error: postError } = await postQuery;
        if (postError) throw postError;
        postResults = (posts || []) as Post[];
      }

      // Search comments
      if (type === 'comment' || type === 'all') {
        const commentQuery = supabase
          .from('comments')
          .select(`
            *,
            author:author_id (
              id,
              username,
              avatar
            ),
            post:post_id (
              id,
              title
            )
          `)
          .textSearch('content', searchQuery, {
            type: 'websearch',
            config: 'english'
          })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (projectId) {
          commentQuery.eq('post.project_id', projectId);
        }

        const { data: comments, error: commentError } = await commentQuery;
        if (commentError) throw commentError;
        commentResults = (comments || []) as Comment[];
      }

      const response: ApiResponse<{
        results: SearchResult;
        metadata: {
          total: number;
          offset: number;
          limit: number;
        };
      }> = {
        success: true,
        data: {
          results: {
            posts: postResults,
            comments: commentResults
          },
          metadata: {
            total: postResults.length + commentResults.length,
            offset,
            limit
          }
        }
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Search failed',
          code: 'SEARCH_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

export default router;