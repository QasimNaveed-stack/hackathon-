/**
 * SEPARATE DATABASE MODULE - PostgreSQL User Repository
 * File: server/database/repositories/PostgresUserRepository.ts
 *
 * Implements IUserRepository using PostgreSQL.
 */

import { IUserRepository } from '../../domain/interfaces/IUserRepository.ts';
import { User } from '../../domain/models/User.ts';
import { TeamMemberDirectoryItem } from '../../domain/models/AITypes.ts';
import { PostgresClient } from '../PostgresClient.ts';

export class PostgresUserRepository implements IUserRepository {
  constructor(private pgClient: PostgresClient) {}

  public async findById(id: string): Promise<User | null> {
    const res = await this.pgClient.query(
      'SELECT id, name, email, password_hash as "passwordHash", role, specialization, skills FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const res = await this.pgClient.query(
      'SELECT id, name, email, password_hash as "passwordHash", role, specialization, skills FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    return res.rows[0] || null;
  }

  public async getTeamDirectory(): Promise<TeamMemberDirectoryItem[]> {
    // Password hash is strictly excluded
    const res = await this.pgClient.query(
      'SELECT id, name, role, specialization, skills FROM users ORDER BY id ASC'
    );
    return res.rows;
  }

  public async save(user: User): Promise<void> {
    await this.pgClient.query(
      `INSERT INTO users (id, name, email, password_hash, role, specialization, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         specialization = EXCLUDED.specialization,
         skills = EXCLUDED.skills`,
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

  public async findAll(): Promise<User[]> {
    const res = await this.pgClient.query(
      'SELECT id, name, email, password_hash as "passwordHash", role, specialization, skills FROM users ORDER BY id ASC'
    );
    return res.rows;
  }

  public async seedUsers(users: User[]): Promise<void> {
    for (const u of users) {
      await this.save(u);
    }
  }
}
