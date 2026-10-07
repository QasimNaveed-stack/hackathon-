/**
 * SEPARATE DATABASE MODULE - PostgreSQL Task Repository
 * File: server/database/repositories/PostgresTaskRepository.ts
 *
 * Implements ITaskRepository using PostgreSQL.
 */

import { ITaskRepository } from '../../domain/interfaces/ITaskRepository.ts';
import { Task } from '../../domain/models/Task.ts';
import { PostgresClient } from '../PostgresClient.ts';

export class PostgresTaskRepository implements ITaskRepository {
  constructor(private pgClient: PostgresClient) {}

  public async create(task: Task): Promise<void> {
    await this.pgClient.query(
      `INSERT INTO tasks (id, project_id, title, description, assignee_id, deadline, estimated_hours, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        task.id,
        task.projectId,
        task.title,
        task.description,
        task.assigneeId,
        task.deadline,
        task.estimatedHours,
        task.createdAt || new Date().toISOString()
      ]
    );
  }

  public async createMany(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      await this.create(task);
    }
  }

  public async findById(id: string): Promise<Task | null> {
    const res = await this.pgClient.query(
      `SELECT id, project_id as "projectId", title, description, assignee_id as "assigneeId", deadline, estimated_hours::float as "estimatedHours", created_at as "createdAt"
       FROM tasks WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  public async findAll(): Promise<Task[]> {
    const res = await this.pgClient.query(
      `SELECT id, project_id as "projectId", title, description, assignee_id as "assigneeId", deadline, estimated_hours::float as "estimatedHours", created_at as "createdAt"
       FROM tasks ORDER BY deadline ASC`
    );
    return res.rows;
  }

  public async findByProjectId(projectId: string): Promise<Task[]> {
    const res = await this.pgClient.query(
      `SELECT id, project_id as "projectId", title, description, assignee_id as "assigneeId", deadline, estimated_hours::float as "estimatedHours", created_at as "createdAt"
       FROM tasks WHERE project_id = $1 ORDER BY deadline ASC`,
      [projectId]
    );
    return res.rows;
  }

  public async findByProjectIds(projectIds: string[]): Promise<Task[]> {
    if (projectIds.length === 0) return [];
    const res = await this.pgClient.query(
      `SELECT id, project_id as "projectId", title, description, assignee_id as "assigneeId", deadline, estimated_hours::float as "estimatedHours", created_at as "createdAt"
       FROM tasks WHERE project_id = ANY($1) ORDER BY deadline ASC`,
      [projectIds]
    );
    return res.rows;
  }

  public async findByAssigneeId(assigneeId: string): Promise<Task[]> {
    const res = await this.pgClient.query(
      `SELECT id, project_id as "projectId", title, description, assignee_id as "assigneeId", deadline, estimated_hours::float as "estimatedHours", created_at as "createdAt"
       FROM tasks WHERE assignee_id = $1 ORDER BY deadline ASC`,
      [assigneeId]
    );
    return res.rows;
  }

  public async deleteAll(): Promise<void> {
    await this.pgClient.query('DELETE FROM tasks');
  }
}
