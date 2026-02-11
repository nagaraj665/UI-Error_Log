import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type LogUpload = {
  id: string;
  filename: string;
  file_size: number;
  total_entries: number;
  total_errors: number;
  categories_found: number;
  uploaded_at: string;
  created_at: string;
};

export type LogEntry = {
  id: string;
  upload_id: string;
  customer: string;
  project: string;
  doi: string;
  stage: string;
  date: string;
  date_time: string;
  error_msg: string;
  code: number;
  column_num: number;
  domain: number;
  level: number;
  line: number;
  element: string;
  element_name: string;
  parent_element: string;
  attribute_name: string;
  category: string;
  type: string;
  created_at: string;
};
