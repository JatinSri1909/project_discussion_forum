import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { supabase } from '../lib/supabase';
import { ApiResponse, Project, Category } from '../types';

const router = Router();

// Create a new project
router.post('/', validate([
  body('name').notEmpty().trim(),
  body('description').optional().trim()
]), async (req, res) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: req.body.name,
        description: req.body.description
      })
      .single();

    if (error) throw error;

    const response: ApiResponse<Project> = {
      success: true,
      data: project
    };

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create project',
        code: 'PROJECT_CREATE_ERROR'
      }
    });
  }
});

// Get project by ID with categories
router.get('/:id', validate([
  param('id').isUUID()
]), async (req, res) => {
  try {
    const [projectResult, categoriesResult] = await Promise.all([
      supabase.from('projects').select('*').eq('id', req.params.id).single(),
      supabase.from('categories').select('*').eq('project_id', req.params.id)
    ]);

    if (projectResult.error) throw projectResult.error;

    const response: ApiResponse<{
      project: Project;
      categories: Category[];
    }> = {
      success: true,
      data: {
        project: projectResult.data,
        categories: categoriesResult.data || []
      }
    };

    res.json(response);
  } catch (err) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      }
    });
  }
});

// Create a category in a project
router.post('/:id/categories', validate([
  param('id').isUUID(),
  body('name').notEmpty().trim(),
  body('slug').notEmpty().trim()
]), async (req, res) => {
  try {
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        project_id: req.params.id,
        name: req.body.name,
        slug: req.body.slug
      })
      .single();

    if (error) throw error;

    const response: ApiResponse<Category> = {
      success: true,
      data: category
    };

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create category',
        code: 'CATEGORY_CREATE_ERROR'
      }
    });
  }
});

// Get project stats
router.get('/:id/stats', validate([
  param('id').isUUID(),
  query('timeRange').optional().isIn(['day', 'week', 'month', 'year', 'all'])
]), async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'all';
    let dateFilter = '';
    
    if (timeRange !== 'all') {
      dateFilter = `and created_at >= now() - interval '1 ${timeRange}'`;
    }

    const { data: stats, error } = await supabase.rpc('get_project_stats', {
      project_id: req.params.id,
      date_filter: dateFilter
    });

    if (error) throw error;

    const response: ApiResponse<{
      totalPosts: number;
      totalComments: number;
      activeUsers: number;
      topCategories: { id: string; name: string; postCount: number }[];
    }> = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get project stats',
        code: 'STATS_FETCH_ERROR'
      }
    });
  }
});

export default router;