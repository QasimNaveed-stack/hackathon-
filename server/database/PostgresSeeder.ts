/**
 * SEPARATE DATABASE MODULE - PostgreSQL Seeder
 * File: server/database/PostgresSeeder.ts
 *
 * Seeds the official 10 demo accounts into the PostgreSQL database.
 * Upserts by unique email so accounts are never duplicated.
 */

import { PostgresClient } from './PostgresClient.ts';
import { DEMO_USERS_SEED_DATA } from '../infrastructure/database/DatabaseSeeder.ts';

export class PostgresSeeder {
  public static async seed(pgClient: PostgresClient): Promise<void> {
    if (!pgClient.isAvailable()) return;

    try {
      for (const user of DEMO_USERS_SEED_DATA) {
        await pgClient.query(
          `INSERT INTO users (id, name, email, password_hash, role, specialization, skills)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             specialization = EXCLUDED.specialization,
             skills = EXCLUDED.skills;`,
          [
            user.id,
            user.name,
            user.email.toLowerCase(),
            user.passwordHash,
            user.role,
            user.specialization,
            user.skills
          ]
        );
      }
      console.log(`[PostgresSeeder] Successfully seeded ${DEMO_USERS_SEED_DATA.length} demo accounts in PostgreSQL.`);
    } catch (err: any) {
      console.error('[PostgresSeeder] Failed to seed demo users in PostgreSQL:', err.message);
    }
  }

  public static async resetToSeed(pgClient: PostgresClient): Promise<void> {
    if (!pgClient.isAvailable()) return;

    await pgClient.executeInTransaction(async client => {
      await client.query('DELETE FROM tasks;');
      await client.query('DELETE FROM projects;');
      await client.query('DELETE FROM users;');

      for (const user of DEMO_USERS_SEED_DATA) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role, specialization, skills)
           VALUES ($1, $2, $3, $4, $5, $6, $7);`,
          [
            user.id,
            user.name,
            user.email.toLowerCase(),
            user.passwordHash,
            user.role,
            user.specialization,
            user.skills
          ]
        );
      }
    });

    console.log('[PostgresSeeder] PostgreSQL database reset to clean demo seed state.');
  }
}
