import { Request, Response, NextFunction } from 'express';

export const validateCompletionRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { code, cursorPosition, language } = req.body;

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Invalid or missing code field' });
    return;
  }

  if (typeof cursorPosition !== 'number' || cursorPosition < 0) {
    res.status(400).json({ error: 'Invalid cursor position' });
    return;
  }

  if (!language || typeof language !== 'string') {
    req.body.language = 'javascript'; // default
  }

  if (code.length > 50000) {
    res.status(400).json({ error: 'Code content too large' });
    return;
  }

  next();
};