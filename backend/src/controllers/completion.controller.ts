import { Request, Response } from 'express';
import { GeminiService } from '../services/gemini.service';
import { CompletionRequest } from '../types/api.types';

export class CompletionController {
  constructor(private geminiService: GeminiService) {}

  async complete(req: Request, res: Response): Promise<void> {
    try {
      const completionRequest: CompletionRequest = req.body;

      // Validate request
      if (!completionRequest.code || typeof completionRequest.cursorPosition !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Invalid request: code and cursorPosition are required'
        });
        return;
      }

      const result = await this.geminiService.getCodeCompletions(completionRequest);
     
      res.json(result);
    } catch (error) {
      console.error('Completion controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}