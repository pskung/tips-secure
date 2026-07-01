CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    name TEXT,
    amount REAL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions(status, created_at);