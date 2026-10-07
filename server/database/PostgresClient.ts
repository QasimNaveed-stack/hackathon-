/**
 * SEPARATE DATABASE MODULE - PostgreSQL Client Engine
 * File: server/database/PostgresClient.ts
 *
 * Implements high-performance connection pooling, table migrations,
 * and ACID transaction management for PostgreSQL.
 * Supports cloud PostgreSQL providers (Aiven, Neon, Supabase, AWS RDS, Cloud SQL)
 * via DATABASE_URL or standard PG environment variables.
 */

import pg from 'pg';
const { Pool } = pg;

export class PostgresClient {
  private static instance: PostgresClient | null = null;
  private pool: pg.Pool | null = null;
  private isConnected: boolean = false;

  private constructor() {
    this.initPool();
  }

  public static getInstance(): PostgresClient {
    if (!PostgresClient.instance) {
      PostgresClient.instance = new PostgresClient();
    }
    return PostgresClient.instance;
  }

  private initPool(): void {
    const connectionString = process.env.DATABASE_URL;
    const ssl = process.env.PGSSLMODE === 'disable' ? false : (
      connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : false
    );

    try {
      if (connectionString) {
        this.pool = new Pool({
          connectionString,
          ssl,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000
        });
      } else if (process.env.PGHOST || process.env.SQL_HOST) {
        this.pool = new Pool({
          host: process.env.PGHOST || process.env.SQL_HOST || 'localhost',
          port: parseInt(process.env.PGPORT || '5432', 10),
          user: process.env.PGUSER || process.env.SQL_USER || 'postgres',
          password: process.env.PGPASSWORD || process.env.SQL_PASSWORD || '',
          database: process.env.PGDATABASE || process.env.SQL_DB_NAME || 'novaworks',
          ssl,
          max: 10,
          connectionTimeoutMillis: 5000
        });
      }
    } catch (err) {
      console.warn('[PostgresClient] Could not initialize Postgres pool:', err);
    }
  }

  public async initializeTables(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const client = await this.pool.connect();
      try {
        console.log('[PostgresClient] Verifying PostgreSQL schema tables...');

        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL,
            specialization VARCHAR(255) NOT NULL,
            skills TEXT[] NOT NULL
          );

          CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            client_name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            manager_id VARCHAR(64) NOT NULL REFERENCES users(id),
            deadline VARCHAR(32) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE TABLE IF NOT EXISTS tasks (
            id VARCHAR(64) PRIMARY KEY,
            project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            assignee_id VARCHAR(64) NOT NULL REFERENCES users(id),
            deadline VARCHAR(32) NOT NULL,
            estimated_hours NUMERIC NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(manager_id);
          CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
          CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
        `);

        this.isConnected = true;
        console.log('[PostgresClient] PostgreSQL schema initialized successfully.');
        return true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[PostgresClient] Postgres connection/initialization check failed:', err.message);
      this.isConnected = false;
      return false;
    }
  }

  public getPool(): pg.Pool | null {
    return this.pool;
  }

  public isAvailable(): boolean {
    return this.isConnected && this.pool !== null;
  }

  public async query<T extends pg.QueryResultRow = any>(text: string, params: any[] = []): Promise<pg.QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Postgres pool not initialized');
    }
    return this.pool.query<T>(text, params);
  }

  public async executeInTransaction<T>(
    work: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('Postgres pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
