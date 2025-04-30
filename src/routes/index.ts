import { Router } from 'express';
import projectRoutes from './project.routes';
import postRoutes from './post.routes';
import commentRoutes from './comment.routes';
import voteRoutes from './vote.routes';
import searchRoutes from './search.routes';

const router = Router();

// API routes
router.use('/projects', projectRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/votes', voteRoutes);
router.use('/search', searchRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;