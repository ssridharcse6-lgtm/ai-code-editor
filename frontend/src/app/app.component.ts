import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { EditorState } from './types/editor.types';
import { v4 as uuidv4 } from 'uuid';
import { CodeEditorComponent } from './components/code-editor/code-editor.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CodeEditorComponent,
        RouterOutlet,
        FormsModule,
        CommonModule,
    ],
    template: `
    <div class="app-container">
        <header class="app-header">
            <h1> Collaborative Code Editor</h1>
            <div class="room-info">
                <span *ngIf="currentRoomId">Room: {{currentRoomId}}</span>
                <button *ngIf="!currentRoomId" (click)="createNewRoom()" class="btn-primary">
                    Create New Room
                </button>
                <button *ngIf="currentRoomId" (click)="leaveRoom()" class="btn-secondary">
                    Leave Room
                </button>
            </div>
        </header>
        <main class="app-main">
            <div *ngIf="!currentRoomId" class="room-selector">
                <div class="room-form">
                    <h2>Join a Collaboration Room</h2>
                    <div class="form-group">
                        <label for="roomInput"> Room ID: </label>
                        <input #roomInput type="text" id="roomInput" placeholder="Enter room ID or leave empty to create new room"
                            (keyup.enter)="joinRoom(roomInput.value)" class="room-input">
                    </div>
                    <div class="form-group">
                        <label for="nameInput"> Your Name (optional): </label>
                        <input #nameInput type="text" id="nameInput" placeholder="Enter your name"
                            [(ngModel)]="userName" class="name-input">
                    </div>
                    <div class="button-group">
                        <button (click)="joinRoom(roomInput.value)" class="btn-primary"> Join Room </button>
                        <button (click)="createNewRoom()" class="btn-secondary"> Create New Room</button>
                    </div>
                </div>
            </div>
            <div *ngIf="currentRoomId" class="editor-section">
                <app-code-editor [roomId]="currentRoomId" [language]="selectedLanguage" (editorStateChange)="onEditorStateChange($event)"></app-code-editor>
                <div class="editor-controls">
                    <div class="language-selector">
                        <label for="languageSelect"> Language: </label>
                        <select id="languageSelect" [(ngModel)]="selectedLanguage" class="language-select">
                            <option value="javascript">Javascript</option>
                            <option value="typescript">Typescript</option>
                        </select>
                    </div>
                </div>
            </div>
        </main>
        <footer class="app-footer">
            <p> Real-time Collaborative Code Editor with AI Completion</p>
        </footer>
    </div>
    `,
    styles: [`
        .app-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .app-header {
            background-color: #2c3e50;
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1)
        }
        .app-header h1 {
            margin: 0;
            font-size: 1.5rem;
        }
        .room-info {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .app-main {
            flex: 1;
            overflow: hidden;
            background-color: #f8f9fa;
        }
        .room-selector: {
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .room-form {
            background-color: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            min-width: 400px;
        }
        .room-form h2 {
            margin-top: 0;
            color: #2c3e50;
            text-align: center;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #555;
            font-weight: 500
        }
        .room-input, .name-input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }
        .button-group {
            display: flex;
            gap: 1rem;
            margin-top: 1.5rem;
        }
        .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: background-colo 0.2s;
        }
        .btn-primary {
            background-color: #3498db;
            color: white;
            flex: 1;
        }
        .btn-primary:hover {
            background-color: #2980b9;
        }
        .btn-secondary {
            background-color: #95a5a6;
            color: white;
        }
        .btn-secondary:hover {
            background-color: #7f8c8d;
        }
        .editor-section {
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 1rem;
            gap: 1rem;
        }
        .editor-controls {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 0.5rem 1rem;
            background: white;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1)
        }
        .language-selector {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .language-select {
            padding: 0.25rem 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .app-footer {
            background-color: #34495e;
            color: white;
            text-align: center;
            padding: 1rem;
        }
        .app-footer p {
            margin: 0;
        }
    `]
})

export class AppComponent implements OnInit {
    currentRoomId: string | null = null;
    selectedLanguage: string = 'javascript';
    userName: string = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        // Check if room ID is provided in URL
        this.route.queryParams.subscribe(params => {
            if (params['roomId']) {
                this.currentRoomId = params['roomId'];
            }
        });
    }

    createNewRoom(): void {
        const newRoomId = `room-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
        this.joinRoom(newRoomId);
    }

    joinRoom(roomId: string): void {
        const finalRoomId = roomId.trim() || `room-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
        this.currentRoomId = finalRoomId;
        // Update URL with room ID
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { roomId: finalRoomId },
            queryParamsHandling: 'merge'
        });
        this.cdr.detectChanges();
    }

    leaveRoom(): void {
        this.currentRoomId = null;
        // Remove room ID from URL
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {}
        });
    }

    onEditorStateChange(state: EditorState): void {
        // Handle editor state changes if needed
        console.log('Editor state changed:', {
            length: state.content.length,
            lines: state.content.split('\n').length,
            cursor: state.cursorPosition
        });
    }
}