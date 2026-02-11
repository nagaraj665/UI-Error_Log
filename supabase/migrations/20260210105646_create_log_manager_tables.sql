/*
  # Create Log Manager Tables

  1. New Tables
    - `log_uploads`
      - `id` (uuid, primary key) - Unique identifier for each upload
      - `filename` (text) - Original filename
      - `file_size` (bigint) - File size in bytes
      - `total_entries` (integer) - Total number of entries in the log
      - `total_errors` (integer) - Total number of errors
      - `categories_found` (integer) - Number of unique error categories
      - `uploaded_at` (timestamptz) - Upload timestamp
      - `created_at` (timestamptz) - Record creation timestamp
    
    - `log_entries`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `upload_id` (uuid, foreign key) - Reference to log_uploads
      - `customer` (text) - Customer name
      - `project` (text) - Project name
      - `doi` (text) - Document identifier
      - `stage` (text) - Processing stage
      - `date` (date) - Error date
      - `date_time` (timestamptz) - Error timestamp
      - `error_msg` (text) - Error message
      - `code` (integer) - Error code
      - `column_num` (integer) - Column number
      - `domain` (integer) - Domain identifier
      - `level` (integer) - Error level
      - `line` (integer) - Line number
      - `element` (text) - Full element markup
      - `element_name` (text) - Element name
      - `parent_element` (text) - Parent element name
      - `attribute_name` (text) - Attribute name
      - `category` (text) - Error category
      - `type` (text) - Error type (warning/error)
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for public access (read/write) since this is a demo application
*/

CREATE TABLE IF NOT EXISTS log_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  file_size bigint DEFAULT 0,
  total_entries integer DEFAULT 0,
  total_errors integer DEFAULT 0,
  categories_found integer DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid REFERENCES log_uploads(id) ON DELETE CASCADE,
  customer text DEFAULT '',
  project text DEFAULT '',
  doi text DEFAULT '',
  stage text DEFAULT '',
  date date,
  date_time timestamptz,
  error_msg text DEFAULT '',
  code integer DEFAULT 0,
  column_num integer DEFAULT 0,
  domain integer DEFAULT 0,
  level integer DEFAULT 0,
  line integer DEFAULT 0,
  element text DEFAULT '',
  element_name text DEFAULT '',
  parent_element text DEFAULT '',
  attribute_name text DEFAULT '',
  category text DEFAULT '',
  type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE log_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read log uploads"
  ON log_uploads FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert log uploads"
  ON log_uploads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read log entries"
  ON log_entries FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert log entries"
  ON log_entries FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_log_entries_upload_id ON log_entries(upload_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_category ON log_entries(category);
CREATE INDEX IF NOT EXISTS idx_log_entries_element_name ON log_entries(element_name);