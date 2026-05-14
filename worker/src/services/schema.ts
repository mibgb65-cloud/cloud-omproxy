export const initialSchemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  daily_request_limit INTEGER,
  daily_cost_limit_micro_usd INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  default_platform TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);
CREATE INDEX IF NOT EXISTS idx_groups_sort_order ON groups(sort_order);

CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  group_id INTEGER,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_used_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_group_id ON api_keys(group_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);

CREATE TABLE IF NOT EXISTS upstream_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'api_key',
  credential_ciphertext TEXT NOT NULL,
  credential_meta_json TEXT,
  base_url TEXT,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'active',
  cooldown_until TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_error_message TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_upstream_accounts_platform ON upstream_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_upstream_accounts_status ON upstream_accounts(status);
CREATE INDEX IF NOT EXISTS idx_upstream_accounts_sched ON upstream_accounts(platform, status, priority, last_used_at);

CREATE TABLE IF NOT EXISTS account_groups (
  account_id INTEGER NOT NULL,
  group_id INTEGER NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_account_groups_group_id ON account_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_account_groups_priority ON account_groups(priority);

CREATE TABLE IF NOT EXISTS model_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  model TEXT NOT NULL,
  input_price_micro_usd_per_token INTEGER NOT NULL DEFAULT 0,
  output_price_micro_usd_per_token INTEGER NOT NULL DEFAULT 0,
  cache_read_price_micro_usd_per_token INTEGER NOT NULL DEFAULT 0,
  cache_write_price_micro_usd_per_token INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_model_prices_platform_model ON model_prices(platform, model);
CREATE INDEX IF NOT EXISTS idx_model_prices_status ON model_prices(status);

CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  api_key_id INTEGER NOT NULL,
  group_id INTEGER,
  upstream_account_id INTEGER,
  platform TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  upstream_endpoint TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_micro_usd INTEGER NOT NULL DEFAULT 0,
  status_code INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  is_stream INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON usage_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key_created ON usage_logs(api_key_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model_created ON usage_logs(model, created_at);

CREATE TABLE IF NOT EXISTS daily_usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stat_date TEXT NOT NULL,
  user_id INTEGER NOT NULL DEFAULT 0,
  api_key_id INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT '',
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_micro_usd INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_daily_usage_dimension ON daily_usage_stats(stat_date, user_id, api_key_id, model);
CREATE INDEX IF NOT EXISTS idx_daily_usage_stat_date ON daily_usage_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage_stats(user_id, stat_date);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  description TEXT,
  is_secret INTEGER NOT NULL DEFAULT 0,
  updated_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_settings_is_secret ON settings(is_secret);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  detail_json TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  backup_type TEXT NOT NULL DEFAULT 'manual',
  object_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by_user_id INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_backups_object_key ON backups(object_key);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);

INSERT OR IGNORE INTO groups (id, name, description, status, sort_order)
VALUES (1, 'Default', 'Default private family group', 'active', 100);

INSERT OR IGNORE INTO model_prices (platform, model, input_price_micro_usd_per_token, output_price_micro_usd_per_token)
VALUES
  ('openai', 'gpt-4.1', 2, 8),
  ('openai', 'gpt-4.1-mini', 1, 3),
  ('anthropic', 'claude-3-5-sonnet-latest', 3, 15),
  ('gemini', 'gemini-2.5-pro', 2, 10),
  ('gemini', 'gemini-2.5-flash', 1, 3);
`

export async function initializeDatabase(db: D1Database) {
  const statements = initialSchemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)

  let executed = 0
  for (const statement of statements) {
    await db.prepare(statement).run()
    executed += 1
  }

  const tables =
    (
      await db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all<{ name: string }>()
    ).results ?? []
  return {
    statements_executed: executed,
    tables: tables.map((table) => table.name),
  }
}
