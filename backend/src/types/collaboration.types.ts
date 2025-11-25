export interface CollaborationRoom {
    id: string;
    participants: Set<string>;
    createdAt: Date;
    lastActivity: Date;
}

export interface UserCursor {
    userId: string;
    position: number;
    selection?: {
        anchor: number;
        head: number;
    };
    userName?: string | undefined;
    color?: string;
}

export interface CollaborationMessage {
    type: 'cursor-update' | 'user-joined' | 'user-left' | 'sync-request' | 'document-update';
    roomId: string;
    userId: string;
    data?: any;
}