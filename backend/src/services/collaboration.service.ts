import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { CollaborationRoom, UserCursor, CollaborationMessage } from '../types/collaboration.types.js';
import { v4 as uuidv4 } from 'uuid';

interface ExtendedWebSocket extends WebSocket {
  roomId?: string;
  userId?: any;
  userName?: string;
}

export class CollaborationService {
  private rooms = new Map<string, CollaborationRoom>();
  private clients = new Map<string, ExtendedWebSocket>();
  private docs = new Map<string, Y.Doc>();

  joinRoom(ws: ExtendedWebSocket, roomId: string, userId?: string, userName?: string): void {
    const finalUserId = userId || uuidv4();
    const finalUserName = userName || `User-${finalUserId.slice(0, 8)}`;

    ws.roomId = roomId;
    ws.userId = finalUserId;
    ws.userName = finalUserName;

    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        participants: new Set(),
        createdAt: new Date(),
        lastActivity: new Date()
      });
      this.docs.set(roomId, new Y.Doc());
    }

    const room = this.rooms.get(roomId)!;
    room.participants.add(finalUserId);
    room.lastActivity = new Date();

    this.clients.set(finalUserId, ws);

    // Send initial sync data
    this.sendToClient(ws, {
      type: 'sync-response',
      roomId,
      userId: finalUserId,
      data: {
        doc: this.getDocumentState(roomId),
        participants: Array.from(room.participants)
      }
    });

    // Notify other participants
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      roomId,
      userId: finalUserId,
      data: { userName: finalUserName }
    }, finalUserId);

    console.log(`User ${finalUserName} joined room ${roomId}`);
  }

  leaveRoom(ws: ExtendedWebSocket): void {
    if (!ws.roomId || !ws.userId) return;

    const room = this.rooms.get(ws.roomId);
    if (room) {
      room.participants.delete(ws.userId);
      room.lastActivity = new Date();

      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(ws.roomId);
        this.docs.delete(ws.roomId);
      }
    }

    this.clients.delete(ws.userId);

    // Notify other participants
    this.broadcastToRoom(ws.roomId, {
      type: 'user-left',
      roomId: ws.roomId,
      userId: ws.userId,
      data: {}
    }, ws.userId);

    console.log(`User ${ws.userName} left room ${ws.roomId}`);
  }

  handleMessage(ws: ExtendedWebSocket, message: any): void {
    try {
      const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
      switch (parsedMessage.type) {
        case 'document-update':
          this.handleDocumentUpdate(ws, parsedMessage);
          break;
        case 'cursor-update':
          this.handleCursorUpdate(ws, parsedMessage);
          break;
        case 'sync-request':
          this.handleSyncRequest(ws, parsedMessage);
          break;
        default:
          console.warn('Unknown message type:', parsedMessage.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private handleDocumentUpdate(ws: ExtendedWebSocket, message: any): void {
    if (!ws.roomId) return;

    const doc = this.docs.get(ws.roomId);
    if (!doc) return;

    // Apply the update to the Y.Doc
    if (message.data && message.data.update) {
      const update = new Uint8Array(message.data.update);
      Y.applyUpdate(doc, update);
    }

    // Broadcast to other clients in the room
    this.broadcastToRoom(ws.roomId, {
      type: 'document-update',
      roomId: ws.roomId,
      userId: ws.userId,
      data: message.data
    }, ws.userId);

    // Update room activity
    const room = this.rooms.get(ws.roomId);
    if (room) {
      room.lastActivity = new Date();
    }
  }

  private handleCursorUpdate(ws: ExtendedWebSocket, message: any): void {
    if (!ws.roomId) return;

    this.broadcastToRoom(ws.roomId, {
      type: 'cursor-update',
      roomId: ws.roomId,
      userId: ws.userId!,
      data: {
        cursor: message.data.cursor,
        userName: ws.userName
      }
    }, ws.userId);
  }

  private handleSyncRequest(ws: ExtendedWebSocket, message: any): void {
    if (!ws.roomId) return;

    this.sendToClient(ws, {
      type: 'sync-response',
      roomId: ws.roomId,
      userId: ws.userId!,
      data: {
        doc: this.getDocumentState(ws.roomId),
        participants: Array.from(this.rooms.get(ws.roomId)?.participants || [])
      }
    });
  }

  private getDocumentState(roomId: string): any {
    const doc = this.docs.get(roomId);
    if (!doc) return null;

    return {
      state: Y.encodeStateAsUpdate(doc),
      version: doc.clientID
    };
  }

  private broadcastToRoom(roomId: string, message: CollaborationMessage, excludeUserId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.participants.forEach(userId => {
      if (userId !== excludeUserId) {
        const client = this.clients.get(userId);
        if (client && client.readyState === WebSocket.OPEN) {
          this.sendToClient(client, message);
        }
      }
    });
  }

  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getRoomInfo(roomId: string): CollaborationRoom | null {
    return this.rooms.get(roomId) || null;
  }

  getAllRooms(): CollaborationRoom[] {
    return Array.from(this.rooms.values());
  }
}