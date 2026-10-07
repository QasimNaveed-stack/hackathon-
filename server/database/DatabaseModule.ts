/**
 * SEPARATE DATABASE MODULE - Master Provider Factory
 * File: server/database/DatabaseModule.ts
 *
 * Exposes repository abstractions for the application.
 * Fully decouples database implementation from the Domain Layer.
 * Primary: PostgreSQL (via PostgresClient, PostgresUserRepository, etc.)
 * Fallback: Local Persistent Store (ensures zero crashes if DATABASE_URL is not yet configured)
 */

import { IUserRepository } from '../domain/interfaces/IUserRepository.ts';
import { IProjectRepository } from '../domain/interfaces/IProjectRepository.ts';
import { ITaskRepository } from '../domain/interfaces/ITaskRepository.ts';
import { ITransactionManager } from '../domain/interfaces/ITransactionManager.ts';

// PostgreSQL Implementations
import { PostgresClient } from './PostgresClient.ts';
import { PostgresSeeder } from './PostgresSeeder.ts';
import { PostgresUserRepository } from './repositories/PostgresUserRepository.ts';
import { PostgresProjectRepository } from './repositories/PostgresProjectRepository.ts';
import { PostgresTaskRepository } from './repositories/PostgresTaskRepository.ts';
import { PostgresTransactionManager } from './repositories/PostgresTransactionManager.ts';

// Local Fallback Storage
import { DatabaseClient, DatabaseSeeder } from '../infrastructure/database/index.ts';
import {
  UserRepository as FileUserRepository,
  ProjectRepository as FileProjectRepository,
  TaskRepository as FileTaskRepository,
  TransactionManager as FileTransactionManager
} from '../infrastructure/repositories/index.ts';

export interface DatabaseModuleInstances {
  userRepository: IUserRepository;
  projectRepository: IProjectRepository;
  taskRepository: ITaskRepository;
  transactionManager: ITransactionManager;
  engineName: 'PostgreSQL' | 'Local Persistent Storage';
  resetDatabase: () => Promise<void>;
}

export class DatabaseModule {
  private static cachedInstances: DatabaseModuleInstances | null = null;

  public static async initialize(): Promise<DatabaseModuleInstances> {
    if (DatabaseModule.cachedInstances) {
      return DatabaseModule.cachedInstances;
    }

    const pgClient = PostgresClient.getInstance();
    const pgReady = await pgClient.initializeTables();

    if (pgReady && pgClient.isAvailable()) {
      console.log('----------------------------------------------------');
      console.log('✓ [DatabaseModule] Using Native PostgreSQL Database');
      console.log('----------------------------------------------------');

      await PostgresSeeder.seed(pgClient);

      const instances: DatabaseModuleInstances = {
        userRepository: new PostgresUserRepository(pgClient),
        projectRepository: new PostgresProjectRepository(pgClient),
        taskRepository: new PostgresTaskRepository(pgClient),
        transactionManager: new PostgresTransactionManager(pgClient),
        engineName: 'PostgreSQL',
        resetDatabase: async () => {
          await PostgresSeeder.resetToSeed(pgClient);
        }
      };

      DatabaseModule.cachedInstances = instances;
      return instances;
    }

    console.log('----------------------------------------------------');
    console.log('ℹ [DatabaseModule] PostgreSQL not detected or unreachable.');
    console.log('ℹ Set DATABASE_URL in .env to connect to your Postgres server.');
    console.log('ℹ Falling back to Local Persistent Storage (data/novaworks_db.json)');
    console.log('----------------------------------------------------');

    const fileDb = DatabaseClient.getInstance();
    DatabaseSeeder.seed(fileDb);

    const instances: DatabaseModuleInstances = {
      userRepository: new FileUserRepository(fileDb),
      projectRepository: new FileProjectRepository(fileDb),
      taskRepository: new FileTaskRepository(fileDb),
      transactionManager: new FileTransactionManager(fileDb),
      engineName: 'Local Persistent Storage',
      resetDatabase: async () => {
        DatabaseSeeder.resetToSeed(fileDb);
      }
    };

    DatabaseModule.cachedInstances = instances;
    return instances;
  }
}
