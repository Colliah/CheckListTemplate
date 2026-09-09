CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Better Auth tables already exist in this database. This migration adds only
-- the application-owned checklist tables and their foreign keys to "user".
CREATE TABLE categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, name VARCHAR(100) NOT NULL, order_index INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE, title VARCHAR(255) NOT NULL, order_index INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE daily_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE, task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, date DATE NOT NULL, is_completed BOOLEAN NOT NULL DEFAULT TRUE, completed_at TIMESTAMPTZ DEFAULT NOW(), CONSTRAINT unique_user_task_date UNIQUE (user_id, task_id, date));
CREATE INDEX idx_daily_logs_lookup ON daily_logs (user_id, date);
CREATE INDEX idx_tasks_category ON tasks (category_id);
