import { Router, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabase } from '../lib/supabase';
import { ApiResponse } from '../types';
import { AuthenticatedRequest } from '../types/express';

const router = Router();

router.post('/', validate([
  body('entityType').isIn(['post', 'comment']),
  body('entityId').isUUID(),
  body('voteType').isIn(['upvote', 'downvote'])
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    const { entityType, entityId, voteType } = req.body;
    const userId = req.user.id;

    try {
      // Start a transaction
      const { error: transactionError } = await supabase.rpc('handle_vote', {
        p_user_id: userId,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_vote_type: voteType
      });

      if (transactionError) throw transactionError;

      // Get updated vote counts
      const { data: updatedEntity, error: fetchError } = await supabase
        .from(entityType + 's')
        .select('upvotes, downvotes')
        .eq('id', entityId)
        .single();

      if (fetchError) throw fetchError;

      const response: ApiResponse<{
        upvotes: number;
        downvotes: number;
        score: number;
      }> = {
        success: true,
        data: {
          upvotes: updatedEntity.upvotes,
          downvotes: updatedEntity.downvotes,
          score: updatedEntity.upvotes - updatedEntity.downvotes
        }
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to cast vote',
          code: 'VOTE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

router.delete('/', validate([
  body('entityType').isIn(['post', 'comment']),
  body('entityId').isUUID()
]), ((req, res, next) => {
  const handler = async (req: AuthenticatedRequest, res: Response) => {
    const { entityType, entityId } = req.body;
    const userId = req.user.id;

    try {
      // Start a transaction
      const { error: transactionError } = await supabase.rpc('remove_vote', {
        p_user_id: userId,
        p_entity_type: entityType,
        p_entity_id: entityId
      });

      if (transactionError) throw transactionError;

      // Get updated vote counts
      const { data: updatedEntity, error: fetchError } = await supabase
        .from(entityType + 's')
        .select('upvotes, downvotes')
        .eq('id', entityId)
        .single();

      if (fetchError) throw fetchError;

      const response: ApiResponse<{
        upvotes: number;
        downvotes: number;
        score: number;
      }> = {
        success: true,
        data: {
          upvotes: updatedEntity.upvotes,
          downvotes: updatedEntity.downvotes,
          score: updatedEntity.upvotes - updatedEntity.downvotes
        }
      };

      res.json(response);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to remove vote',
          code: 'VOTE_REMOVE_ERROR'
        }
      });
    }
  };
  return handler(req as AuthenticatedRequest, res);
}));

export default router;