/**
 * INFRASTRUCTURE LAYER - Composite / Multi-Provider AI Parser
 * File: server/infrastructure/ai/CompositeAIParser.ts
 *
 * Implements IAIParser.
 * Dynamically selects the best available AI provider:
 * 1. OpenRouter (if OPENROUTER_API_KEY is configured)
 * 2. Gemini (if GEMINI_API_KEY is configured)
 * 3. Deterministic Heuristic Fallback (for zero-setup local offline judging)
 */

import { IAIParser } from '../../domain/interfaces/IAIParser.ts';
import { TeamMemberDirectoryItem, AITranscriptOutput } from '../../domain/models/AITypes.ts';
import { OpenRouterAIParser } from './OpenRouterAIParser.ts';
import { GeminiAIParser } from './GeminiAIParser.ts';

export class CompositeAIParser implements IAIParser {
  private geminiParser: GeminiAIParser;

  constructor() {
    this.geminiParser = new GeminiAIParser();
  }

  public async parseTranscript(
    transcript: string,
    teamDirectory: TeamMemberDirectoryItem[]
  ): Promise<AITranscriptOutput> {
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // 1. If OpenRouter is configured, invoke OpenRouter
    if (openRouterKey && openRouterKey.trim().length > 0) {
      try {
        console.log('[CompositeAIParser] Dispatching transcript to OpenRouter API...');
        const openRouter = new OpenRouterAIParser();
        return await openRouter.parseTranscript(transcript, teamDirectory);
      } catch (err: any) {
        console.warn('[CompositeAIParser] OpenRouter call failed, falling back to Gemini/Heuristic:', err.message);
      }
    }

    // 2. Fall back to Gemini parser (which also includes offline heuristic fallback)
    console.log('[CompositeAIParser] Dispatching transcript to Gemini / Heuristic Parser...');
    return await this.geminiParser.parseTranscript(transcript, teamDirectory);
  }
}
