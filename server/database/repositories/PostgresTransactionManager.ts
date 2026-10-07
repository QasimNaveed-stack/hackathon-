/**
 * SEPARATE DATABASE MODULE - PostgreSQL Transaction Manager
 * File: server/database/repositories/PostgresTransactionManager.ts
 *
 * Implements ITransactionManager with native PostgreSQL BEGIN / COMMIT / ROLLBACK transactions.
 */

import { ITransactionManager } from '../../domain/interfaces/ITransactionManager.ts';
import { PostgresClient } from '../PostgresClient.ts';

export class PostgresTransactionManager implements ITransactionManager {
  constructor(private pgClient: PostgresClient) {}

  public async executeInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return this.pgClient.executeInTransaction(async () => {
      return await work();
    });
  }
}
