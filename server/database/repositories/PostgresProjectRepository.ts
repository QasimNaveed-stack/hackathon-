/**
 * SEPARATE DATABASE MODULE - PostgreSQL Project Repository
 * File: server/database/repositories/PostgresProjectRepository.ts
 *
 * Implements IProjectRepository using PostgreSQL.
 */

import { IProjectRepository } from '../../domain/interfaces/IProjectRepository.ts';
import { Project } from '../../domain/models/Project.ts';
import { PostgresClient } from '../PostgresClient.ts';

export class PostgresProjectRepository implements IProjectRepository {
  constructor(private pgClient: PostgresClient) {}

  public async create(project: Project): Promise<void> {
    await this.pgClient.query(
      `INSERT INTO projects (id, name, client_name, description, manager_id, deadline, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        project.id,
        project.name,
        project.clientName,
        project.description,
        project.managerId,
        project.deadline,
        project.createdAt || new Date().toISOString()
      ]
    );
  }

  public async createMany(projects: Project[]): Promise<void> {
    for (const project of projects) {
      await this.create(project);
    }
  }

  public async findById(id: string): Promise<Project | null> {
    const res = await this.pgClient.query(
      `SELECT id, name, client_name as "clientName", description, manager_id as "managerId", deadline, created_at as "createdAt"
       FROM projects WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async findAll(): Promise<Project[]> {
    const res = await this.pgClient.query(
      `SELECT id, name, client_name as "clientName", description, manager_id as "managerId", deadline, created_at as "createdAt"
       FROM projects ORDER BY deadline ASC`
    );
    return res.rows;
  }

  public async findByManagerId(managerId: string): Promise<Project[]> {
    const res = await this.pgClient.query(
      `SELECT id, name, client_name as "clientName", description, manager_id as "managerId", deadline, created_at as "createdAt"
       FROM projects WHERE manager_id = $1 ORDER BY deadline ASC`,
      [managerId]
    );
    return res.rows;
  }

  public async findProjectsForAgent(agentId: string): Promise<Project[]> {
    const res = await this.pgClient.query(
      `SELECT DISTINCT p.id, p.name, p.client_name as "clientName", p.description, p.manager_id as "managerId", p.deadline, p.created_at as "createdAt"
       FROM projects p
       INNER JOIN tasks t ON t.project_id = p.id
       WHERE t.assignee_id = $1
       ORDER BY p.deadline ASC`,
      [agentId]
    );
    return res.rows;
  }

  public async deleteAll(): Promise<void> {
    await this.pgClient.query('DELETE FROM projects');
  }
}
