import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabase } from '../lib/supabase';
import { ApiResponse, CreatePostRequest, Post } from '../types';
import { AuthenticatedRequest, AuthenticatedHandler } from '../types/express';
import { processContent } from '../lib/content-processor';

const router = Router();

router.post('/', validate([
  body('projectId').isUUID(),
  body('title').notEmpty().trim(),
  body('content').notEmpty(),
  body('contentType').isIn(['text', 'code', 'link', 'poll']),
  body('categories').isArray()
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const postData = req.body as Required<CreatePostRequest>;
      const userId = req.user.id;

      // Process content (handle markdown, code highlighting, etc)
      const processedContent = processContent(postData.content, postData.contentType || 'text');

      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          project_id: postData.projectId,
          author_id: userId,
          title: postData.title,
          content: processedContent,
          content_type: postData.contentType || 'text',
          categories: postData.categories || []
        })
        .select()
        .single();

      if (postError) throw postError;

      // Handle attachments if any
      if (Array.isArray(postData.attachments) && postData.attachments.length > 0) {
        const attachments = postData.attachments.map(attachment => ({
          post_id: (post as Post).id,
          file_url: attachment.fileUrl,
          file_name: attachment.fileName,
          file_size: attachment.fileSize,
          attachment_type: attachment.attachmentType
        }));

        const { error: attachmentError } = await supabase
          .from('attachments')
          .insert(attachments);

        if (attachmentError) throw attachmentError;
      }

      // Handle mentions if any
      if (Array.isArray(postData.mentions) && postData.mentions.length > 0) {
        const mentions = postData.mentions.map(userId => ({
          entity_type: 'post',
          entity_id: (post as Post).id,
          mentioned_user_id: userId
        }));

        const { error: mentionError } = await supabase
          .from('mentions')
          .insert(mentions);

        if (mentionError) throw mentionError;

        // Create notifications for mentions
        const notifications = postData.mentions.map(userId => ({
          recipient_id: userId,
          message: `You were mentioned in a post: ${postData.title}`,
          type: 'mention' as const
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }

      const response: ApiResponse<Post> = {
        success: true,
        data: post as Post
      };

      return res.status(201).json(response);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create post',
          code: 'POST_CREATE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

router.get('/project/:projectId', validate([
  param('projectId').isUUID(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('offset').optional().isInt({ min: 0 }),
  query('sortBy').optional().isIn(['new', 'top', 'controversial', 'trending']),
  query('timeRange').optional().isIn(['day', 'week', 'month', 'year', 'all'])
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 25;
      const cursor = req.query.cursor as string;
      const sortBy = (req.query.sortBy as string) || 'new';
      const timeRange = (req.query.timeRange as string) || 'all';

      let query = supabase
        .from('posts')
        .select(`
          *,
          author:author_id (
            id,
            username,
            avatar,
            reputation
          ),
          attachments (
            id,
            file_url,
            file_name,
            file_size,
            attachment_type
          )
        `)
        .eq('project_id', req.params.projectId)
        .limit(limit + 1);

      // Apply time range filter if not 'all'
      if (timeRange !== 'all') {
        const now = new Date();
        let startDate = new Date();
        switch (timeRange) {
          case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply sorting and cursor-based pagination
      switch (sortBy) {
        case 'new':
          query = query.order('created_at', { ascending: false });
          if (cursor) {
            query = query.lt('created_at', cursor);
          }
          break;
        case 'top':
          query = query.order('score', { ascending: false });
          if (cursor) {
            query = query.lt('score', cursor);
          }
          break;
        case 'controversial':
          query = query.order('comment_count', { ascending: false });
          if (cursor) {
            query = query.lt('comment_count', cursor);
          }
          break;
        case 'trending':
          query = query.order('trending_score', { ascending: false });
          if (cursor) {
            query = query.lt('trending_score', cursor);
          }
          break;
      }

      const { data: posts, error } = await query;

      if (error) throw error;

      // Remove the extra item we fetched to check for more pages
      const hasMore = posts && posts.length > limit;
      const items = posts ? posts.slice(0, limit) : [];
      
      // Get the cursor for the next page
      const nextCursor = hasMore && items.length > 0 ? 
        items[items.length - 1][sortBy === 'new' ? 'created_at' : 
          sortBy === 'top' ? 'score' : 
          sortBy === 'controversial' ? 'comment_count' : 
          'trending_score'] : 
        null;

      const response: ApiResponse<{
        posts: Post[];
        metadata: {
          hasMore: boolean;
          nextCursor: string | null;
          limit: number;
        };
      }> = {
        success: true,
        data: {
          posts: items as Post[],
          metadata: {
            hasMore,
            nextCursor,
            limit
          }
        }
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch posts',
          code: 'POSTS_FETCH_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

router.patch('/:id', validate([
  param('id').isUUID(),
  body('title').optional().trim(),
  body('content').optional(),
  body('contentType').optional().isIn(['text', 'code', 'link', 'poll']),
  body('categories').optional().isArray()
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;

      // Verify post ownership
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !post || (post.author_id !== userId && !req.user.isAdmin)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Not authorized to update this post',
            code: 'NOT_AUTHORIZED'
          }
        });
      }

      const updates: Partial<Post> = {};
      
      if (req.body.title) updates.title = req.body.title;
      if (req.body.content) {
        updates.content = processContent(req.body.content, req.body.contentType || post.content_type);
        if (req.body.contentType) updates.content_type = req.body.contentType;
      }
      if (req.body.categories) updates.categories = req.body.categories;

      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', req.params.id)
        .single();

      if (updateError) throw updateError;

      const response: ApiResponse<Post> = {
        success: true,
        data: updatedPost as Post
      };

      return res.json(response);
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update post',
          code: 'POST_UPDATE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

router.delete('/:id', validate([
  param('id').isUUID()
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;

      // Verify post ownership or admin status
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('author_id')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !post || (post.author_id !== userId && !req.user.isAdmin)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Not authorized to delete this post',
            code: 'NOT_AUTHORIZED'
          }
        });
      }

      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) throw deleteError;

      return res.json({
        success: true
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete post',
          code: 'POST_DELETE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

export default router;