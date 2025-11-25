import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { GeminiService } from './services/gemini.service';
import { CollaborationService } from './services/collaboration.service';
import { CompletionController } from './controllers/completion.controller';
import { CollaborationController } from './controllers/collaboration.controller';
import { validateCompletionRequest } from './middleware/validation.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

dotenv.config();

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize services
const geminiService = new GeminiService(GEMINI_API_KEY);
const collaborationService = new CollaborationService();

// Initialize controllers
const completionController = new CompletionController(geminiService);
const collaborationController = new CollaborationController(collaborationService);

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.post('/api/complete', validateCompletionRequest, (req, res) => {
  completionController.complete(req, res);
});

app.get('/api/rooms', (req, res) => {
  collaborationController.getAllRooms(req, res);
});

app.get('/api/rooms/:roomId', (req, res) => {
  collaborationController.getRoomInfo(req, res);
});

app.post('/api/rooms', (req, res) => {
  collaborationController.createRoom(req, res);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time collaboration
const wss = new WebSocketServer({
  server,
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId');
  const userId = url.searchParams.get('userId');
  const userName = url.searchParams.get('userName');

  if (!roomId) {
    ws.close(1008, 'Room ID is required');
    return;
  }

  console.log(`New WebSocket connection for room: ${roomId}`);

  // Join the collaboration room
  collaborationService.joinRoom(ws as any, roomId, userId || undefined, userName || undefined);

  // Handle incoming messages
  ws.on('message', (data) => {
    collaborationService.handleMessage(ws as any, data);
  });

  // Handle client disconnect
  ws.on('close', () => {
    collaborationService.leaveRoom(ws as any);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    collaborationService.leaveRoom(ws as any);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Code completion API: http://localhost:${PORT}/api/complete`);
  console.log(`WebSocket server: ws://localhost:${PORT}/ws`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;