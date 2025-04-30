import { CronJob } from 'cron';
import { supabase } from './supabase';
import logger from './logger';

// Update trending scores every 15 minutes
export const initTrendingScoreUpdater = () => {
  const job = new CronJob('*/15 * * * *', async () => {
    try {
      logger.info('Starting trending score update job');
      const { error } = await supabase.rpc('refresh_trending_scores_job');
      
      if (error) {
        throw error;
      }
      
      logger.info('Trending score update completed successfully');
    } catch (err) {
      logger.error('Error updating trending scores:', {
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
    }
  });

  job.start();
  logger.info('Trending score update scheduler initialized');
  
  return job;
};