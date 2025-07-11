// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://aeuhkjyhwvrzcxlmxqya.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFldWhranlod3ZyemN4bG14cXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MjEzNDQsImV4cCI6MjA2NzI5NzM0NH0.oDVRXo09_rRS0HVnTk83R34KoruSDSuDoyB25Q5VmiI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});