/**
 * API LAYER - Routes & Dependency Injection Container
 * File: server/api/routes.ts
 *
 * Assembles and wires together:
 * - Standalone Database Module: DatabaseModule (PostgreSQL / fallback)
 * - Domain: TranscriptProcessingService
 * - Infrastructure: CompositeAIParser (OpenRouter / Gemini)
 * - Controllers: AuthController, ProjectController, TaskController, TeamController, TranscriptController
 */

import { Router } from 'express';
import { DatabaseModule } from '../database/DatabaseModule.ts';
import { CompositeAIParser } from '../infrastructure/ai/CompositeAIParser.ts';
import { TranscriptProcessingService } from '../domain/services/TranscriptProcessingService.ts';
import { authMiddleware, requireRole } from './middleware/auth.ts';
import { AuthController } from './controllers/AuthController.ts';
import { ProjectController } from './controllers/ProjectController.ts';
import { TaskController } from './controllers/TaskController.ts';
import { TeamController } from './controllers/TeamController.ts';
import { TranscriptController } from './controllers/TranscriptController.ts';

export async function createApiRouter(): Promise<Router> {
  const router = Router();

  // 1. Initialize Standalone Database Module (PostgreSQL with fallback)
  const dbModule = await DatabaseModule.initialize();
  const userRepo = dbModule.userRepository;
  const projectRepo = dbModule.projectRepository;
  const taskRepo = dbModule.taskRepository;
  const transactionManager = dbModule.transactionManager;

  // 2. Initialize AI Parser (OpenRouter + Gemini via Composite)
  const aiParser = new CompositeAIParser();

  // 3. Initialize Domain Service (Inversion of Control)
  const transcriptService = new TranscriptProcessingService(
    userRepo,
    projectRepo,
    taskRepo,
    aiParser,
    transactionManager
  );

  // 4. Initialize Controllers
  const authController = new AuthController(userRepo);
  const projectController = new ProjectController(projectRepo, taskRepo, userRepo);
  const taskController = new TaskController(taskRepo, projectRepo, userRepo);
  const teamController = new TeamController(userRepo);
  const transcriptController = new TranscriptController(transcriptService, userRepo, dbModule.resetDatabase);

  const auth = authMiddleware(userRepo);

  // Database info status endpoint
  router.get('/db-status', (req, res) => {
    res.json({
      engine: dbModule.engineName,
      status: 'active',
      time: new Date().toISOString()
    });
  });

  // --- Public Auth Routes ---
  router.post('/auth/login', authController.login);

  // --- Protected Auth Routes ---
  router.get('/auth/me', auth, authController.getCurrentUser);
  router.post('/auth/logout', auth, authController.logout);

  // --- Project Routes (Role-Scoped in Controller) ---
  router.get('/projects', auth, projectController.listProjects);
  router.get('/projects/:id', auth, projectController.getProjectById);

  // --- Task Routes (Role-Scoped in Controller) ---
  router.get('/tasks/my-tasks', auth, taskController.getMyTasks);

  // --- Team Directory ---
  router.get('/team', auth, teamController.getTeam);

  // --- Admin Transcript Automation ---
  router.post('/projects/from-transcript', auth, requireRole('ADMIN'), transcriptController.createFromTranscript);
  router.post('/admin/reset-demo', auth, requireRole('ADMIN'), transcriptController.resetDemoData);

  return router;
}
