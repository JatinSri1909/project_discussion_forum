import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabase } from '../lib/supabase';
import { ApiResponse, Comment, CreateCommentRequest } from '../types';
import { AuthenticatedRequest, AuthenticatedHandler } from '../types/express';
import { processContent } from '../lib/content-processor';

const router = Router();

interface Notification {
  recipient_id: string;
  message: string;
  type: 'mention' | 'comment_reply';
}

// Create a comment
router.post('/', validate([
  body('postId').isUUID(),
  body('parentCommentId').optional().isUUID(),
  body('content').notEmpty().trim(),
  body('contentType').isIn(['text', 'code']),
  body('mentions').optional().isArray(),
  body('clientCommentId').notEmpty()
]), ((req, res, next) => {
  const handler: AuthenticatedHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const commentData: CreateCommentRequest = req.body;
      const userId = req.user.id;

      // Calculate comment depth
      let depth = 0;
      if (commentData.parentCommentId) {
        const { data: parentComment } = await supabase
          .from('comments')
          .select('depth')
          .eq('id', commentData.parentCommentId)
          .single();
        
        if (parentComment) {
          depth = parentComment.depth + 1;
        }
      }

      // Process content (handle markdown, code highlighting, etc)
      const processedContent = processContent(commentData.content, commentData.contentType);

      // Create comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: commentData.postId,
          parent_comment_id: commentData.parentCommentId,
          author_id: userId,
          content: processedContent,
          content_type: commentData.contentType,
          depth
        })
        .select()
        .single();

      if (commentError || !comment) throw commentError;

      // Handle mentions
      if (commentData.mentions && commentData.mentions.length > 0) {
        const mentions = commentData.mentions.map(userId => ({
          entity_type: 'comment',
          entity_id: comment.id,
          mentioned_user_id: userId
        }));

        const { error: mentionError } = await supabase
          .from('mentions')
          .insert(mentions);

        if (mentionError) throw mentionError;
      }

      // Create notifications
      const notifications: Notification[] = [];
      
      // Notify parent comment author if this is a reply
      if (commentData.parentCommentId) {
        const { data: parentComment } = await supabase
          .from('comments')
          .select('author_id')
          .eq('id', commentData.parentCommentId)
          .single();

        if (parentComment && parentComment.author_id !== userId) {
          notifications.push({
            recipient_id: parentComment.author_id,
            message: 'Someone replied to your comment',
            type: 'comment_reply'
          });
        }
      }

      // Notify mentioned users
      if (commentData.mentions) {
        notifications.push(...commentData.mentions.map(userId => ({
          recipient_id: userId,
          message: 'You were mentioned in a comment',
          type: 'mention' as const
        })));
      }

      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) throw notifError;
      }

      const response: ApiResponse<Comment & { threadUpdate?: { totalComments: number } }> = {
        success: true,
        data: comment
      };

      res.status(201).send(response);
    } catch (err) {
      res.status(500).send({
        success: false,
        error: {
          message: 'Failed to create comment',
          code: 'COMMENT_CREATE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

// Get comment thread
router.get('/thread/:commentId', validate([
  param('commentId').isUUID(),
  query('limit').optional().isInt({ min: 1, max: 50 })
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 25;

      // Get the root comment and its descendants
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:author_id (
            id,
            username,
            avatar
          )
        `)
        .eq('id', req.params.commentId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const response: ApiResponse<{
        comments: Comment[];
      }> = {
        success: true,
        data: {
          comments: comments || []
        }
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch comments',
          code: 'COMMENTS_FETCH_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

// Update a comment
router.patch('/:id', validate([
  param('id').isUUID(),
  body('content').optional().trim(),
  body('contentType').optional().isIn(['text', 'code'])
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;

      // Verify comment ownership
      const { data: comment, error: fetchError } = await supabase
        .from('comments')
        .select('author_id')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !comment || (comment.author_id !== userId && !req.user.isAdmin)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Not authorized to update this comment',
            code: 'NOT_AUTHORIZED'
          }
        });
      }

      const processedContent = processContent(req.body.content, req.body.contentType);

      const { data: updatedComment, error: updateError } = await supabase
        .from('comments')
        .update({
          content: processedContent,
          content_type: req.body.contentType
        })
        .eq('id', req.params.id)
        .single();

      if (updateError) throw updateError;

      const response: ApiResponse<Comment> = {
        success: true,
        data: updatedComment
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update comment',
          code: 'COMMENT_UPDATE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

// Delete a comment
router.delete('/:id', validate([
  param('id').isUUID()
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user.id;

      // Verify comment ownership or admin status
      const { data: comment, error: fetchError } = await supabase
        .from('comments')
        .select('author_id')
        .eq('id', req.params.id)
        .single();

      if (fetchError || !comment || (comment.author_id !== userId && !req.user.isAdmin)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Not authorized to delete this comment',
            code: 'NOT_AUTHORIZED'
          }
        });
      }

      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) throw deleteError;

      res.json({
        success: true
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete comment',
          code: 'COMMENT_DELETE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

export default router;