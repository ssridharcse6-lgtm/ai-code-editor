import { Request, Response } from 'express';
import { CollaborationService } from '../services/collaboration.service';

export class CollaborationController {
  constructor(private collaborationService: CollaborationService) {}

  getRoomInfo(req: Request, res: Response): void {
    const { roomId } = req.params;
    const room = this.collaborationService.getRoomInfo(roomId);
   
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json({
      id: room.id,
      participantCount: room.participants.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    });
  }

  getAllRooms(req: Request, res: Response): void {
    const rooms = this.collaborationService.getAllRooms();
    res.json(rooms.map(room => ({
      id: room.id,
      participantCount: room.participants.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    })));
  }

  createRoom(req: Request, res: Response): void {
    const roomId = req.body.roomId || `room-${Date.now()}`;
    res.json({ roomId });
  }
}