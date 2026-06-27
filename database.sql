-- Run this SQL in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New Query → paste and click Run)

CREATE TABLE students (
  student_id         TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  math_group         INTEGER NOT NULL,
  math_grade         INTEGER NOT NULL,
  eng_grade          INTEGER NOT NULL,
  pre_assigned       TEXT,
  chosen_majors      TEXT[]   DEFAULT '{}',
  has_modified_choice BOOLEAN DEFAULT FALSE,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone to read/write (the app handles its own auth via admin password)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON students
  FOR ALL USING (true) WITH CHECK (true);
