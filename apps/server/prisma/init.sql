-- PostgreSQL initialization script for HyperGate
-- This runs automatically when the container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant permissions (already done by default but explicit for clarity)
GRANT ALL PRIVILEGES ON DATABASE hypergate TO hypergate;
