-- ============================================================
-- BRUTAL LEDGER — Complete Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";



-- ============================================================
-- TABLE: projects
-- ============================================================
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'var(--accent)',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: tasks
-- ============================================================
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  timer_started_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: habits_log
-- ============================================================
CREATE TABLE habits_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  habit_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, habit_key)
);

ALTER TABLE habits_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own habits" ON habits_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: sleep_log
-- ============================================================
CREATE TABLE sleep_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, slot_number)
);

ALTER TABLE sleep_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sleep" ON sleep_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: outreach_prospects
-- ============================================================
CREATE TABLE outreach_prospects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  linkedin_url TEXT,
  status TEXT NOT NULL DEFAULT 'Warming' CHECK (status IN ('Warming', 'DM Sent', 'Replied', 'Call Booked', 'Proposal Sent', 'Closed', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outreach_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own prospects" ON outreach_prospects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: outreach_comments
-- ============================================================
CREATE TABLE outreach_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prospect_id UUID REFERENCES outreach_prospects(id) ON DELETE CASCADE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outreach_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own comments" ON outreach_comments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: outreach_daily_count
-- ============================================================
CREATE TABLE outreach_daily_count (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  dm_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE outreach_daily_count ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own daily count" ON outreach_daily_count
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: linkedin_posts
-- ============================================================
CREATE TABLE linkedin_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('Text', 'Carousel', 'Image', 'Poll')) ,
  content_text TEXT,
  image_url TEXT,
  date_posted DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  impressions_d1 INTEGER DEFAULT 0,
  impressions_d7 INTEGER DEFAULT 0,
  impressions_d30 INTEGER DEFAULT 0,
  comments_received INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own posts" ON linkedin_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: expenses
-- ============================================================
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  item_name TEXT NOT NULL,
  amount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Other' CHECK (category IN ('Food', 'Tools', 'Transport', 'Personal', 'Other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: income_log
-- ============================================================
CREATE TABLE income_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  source_name TEXT NOT NULL,
  amount_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own income" ON income_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: savings_balance
-- ============================================================
CREATE TABLE savings_balance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  balance_pkr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own savings" ON savings_balance
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: study_log
-- ============================================================
CREATE TABLE study_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Karachi')::DATE,
  subject TEXT NOT NULL CHECK (subject IN ('Computer Science', 'Mathematics', 'Physics', 'Economics')),
  minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE study_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own study" ON study_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: weekly_scorecard
-- ============================================================
CREATE TABLE weekly_scorecard (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start DATE NOT NULL,
  what_avoided TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_scorecard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scorecard" ON weekly_scorecard
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: savings_goal (for custom monthly savings target)
-- ============================================================
CREATE TABLE savings_goal (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_pkr NUMERIC(12, 2) NOT NULL DEFAULT 15000,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE savings_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own savings goal" ON savings_goal
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_habits_log_user_date ON habits_log(user_id, date);
CREATE INDEX idx_sleep_log_user_date ON sleep_log(user_id, date);
CREATE INDEX idx_outreach_daily_user_date ON outreach_daily_count(user_id, date);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX idx_study_log_user_date ON study_log(user_id, date);
CREATE INDEX idx_linkedin_posts_user_date ON linkedin_posts(user_id, date_posted);
CREATE INDEX idx_income_log_user_date ON income_log(user_id, date);
CREATE INDEX idx_outreach_prospects_user ON outreach_prospects(user_id);
CREATE INDEX idx_outreach_comments_prospect ON outreach_comments(prospect_id);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX idx_tasks_project ON tasks(project_id);
