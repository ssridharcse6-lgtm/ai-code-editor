import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CollaboratorInfo, RoomInfo } from '../types/editor.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
    providedIn: 'root'
})
export class CollaborationService {
    private ydoc: Y.Doc | null = null;
    private provider: WebsocketProvider | null = null;
    private ytext: Y.Text | null = null;

    private collaboratorsSubject = new BehaviorSubject<CollaboratorInfo[]>([]);
    private connectionStatusSubject = new BehaviorSubject<boolean>(false);
    private messagesSubject = new Subject<any>();

    private currentRoomId: string | null = null;
    private currentUserId: string = uuidv4();
    private currentUserName: string = `User-${this.currentUserId.slice(0,8)}`;

    constructor() {}

    get collaborators$(): Observable<CollaboratorInfo[]> {
        return this.collaboratorsSubject.asObservable();
    }

    get connectionStatus$(): Observable<boolean> {
        return this.connectionStatusSubject.asObservable();
    }

    get messages$(): Observable<any> {
        return this.messagesSubject.asObservable();
    }

    get currentRoom(): string | null {
        return this.currentRoomId;
    }

    get userId(): string {
        return this.currentUserId;
    }

    get userName(): string {
        return this.currentUserName;
    }

    setUserName(name: string): void {
        this.currentUserName = name;
    }

    joinRoom(roomId: string): Observable<Y.Text> {
        return new Observable(subscriber => {
            try {
                this.leaveCurrentRoom();

                this.currentRoomId = roomId;
                this.ydoc = new Y.Doc();
                this.ytext = this.ydoc.getText('content');

                // Set Websocket connection
                const wsUrl = this.buildWebSocketUrl(roomId);
                this.provider = new WebsocketProvider(wsUrl, roomId, this.ydoc, {
                    connect: true,
                    params: {
                        userId: this.currentUserId,
                        userName: this.currentUserName
                    }
                });

                // Listen for connection status
                this.provider.on('status', (event: any) => {
                    this.connectionStatusSubject.next(event.status === 'connected');
                });

                // Listen for awareness changes (collaborators)
                this.provider.awareness.on('change', () => {
                    this.updateCollaborators();
                })

                // Listen for sync
                this.provider.on('sync', (isSynced: boolean) => {
                    if (isSynced) {
                        subscriber.next(this.ytext!);
                        subscriber.complete();
                    } else {
                        subscriber.error(new Error('Y.Text not initialized after sync'))
                    }
                });

                // Set initial awareness state
                this.provider.awareness.setLocalStateField('user', {
                    name: this.currentUserName,
                    color: this.generateUserColor(),
                    userId: this.currentUserId
                });
                subscriber.next(this.ytext!);
                subscriber.complete();
            } catch (error) {
                subscriber.error(error);
            }
        });
    }

    leaveCurrentRoom(): void {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }

        if (this.ydoc) {
            this.ydoc.destroy();
            this.ydoc = null;
        }

        this.ytext = null;
        this.currentRoomId = null;
        this.connectionStatusSubject.next(false);
        this.collaboratorsSubject.next([]);
    }

    updateCursor(position: number, selection?: { anchor: number, head: number }): void {
        if (!this.provider) return;

        this.provider.awareness.setLocalStateField('cursor', {
            position,
            selection,
            timestamp: Date.now()
        });
    }

    getSharedText(): Y.Text | null {
        return this.ytext;
    }

    private buildWebSocketUrl(roomId: string): string {
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = window.location.hostname;
        const wsPort = this.getWebSocketPort();

        return `${wsProtocol}//${wsHost}:${wsPort}/ws?roomId=${roomId}&userId=${this.currentUserId}&userName=${encodeURIComponent(this.currentUserName)}`;
    }

    private getWebSocketPort(): string {
        // In development, use the backend port
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return '3000';
        }
        return window.location.port || (window.location.protocol === 'https:' ? '443': '80')
    }

    private updateCollaborators(): void {
        if (!this.provider) return;

        const states = this.provider.awareness.getStates();
        const collaborators: CollaboratorInfo[] = [];
        states.forEach((state: any, clientId: any)=> {
            // if (clientId !== this.provider!.awareness.clientID && state.user) {
                collaborators.push({
                    id: state.user.userId || clientId.toString(),
                    name: state.user.name || 'Anonymous',
                    color: state.user.color || '#000000',
                    cursor: state.cursor || undefined
                })
            // }
        });
        this.collaboratorsSubject.next(collaborators);
    }

    private generateUserColor(): string {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}