import { createClient } from '@supabase/supabase-js';
import env from '../config/environment';

// Create a single supabase client for interacting with your database
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

// Admin client for privileged operations
const adminSupabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export { supabase, adminSupabase };