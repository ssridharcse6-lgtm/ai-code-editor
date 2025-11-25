import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete';
import { yCollab } from 'y-codemirror.next';
import * as Y from 'yjs';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { CodeCompletionService } from '../../services/code-completion.service';
import { CollaborationService } from '../../services/collaboration.service';
import { EditorState as AppEditorState, CollaboratorInfo } from '../../types/editor.types';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-code-editor',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="editor-container">
            <div class="editor-header">
                <div class="collaborators">
                    <span class="collaborator-label">Collaborators: </span>
                    <div class="collaborator-list">
                        <div
                          *ngFor="let collaborator of collaborators"
                          class="collaborator-chip"
                          [style.background-color]="collaborator.color">
                        {{collaborator.name}}
                        </div>
                    </div>
                </div>
                <div class="connection-status">
                    <span
                     class="status-indicator"
                     [class.connected]="isConnected"
                     [class.disconnected]="!isConnected">
                    {{isConnected ? 'Connected': 'Disconnected'}}
                    </span>
                </div>
            </div>
            <div #editorRef class="code-editor"></div>
            <div class="editor-footer">
                <div class="editor-info">
                    <span>Language: {{language}}</span>
                    <span>Lines: {{lineCount}}</span>
                    <span>Characters: {{charCount}}</span>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .editor-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }
        .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background-color: #f5f5f5;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
        }
        .collaborators {
            display: flex;
            align-items:center;
            gap: 8px;
        }
        .collaborator-label {
            font-weight: 500;
            color: #666;
        }
        .collaborator-list {
            display: flex;
            gap: 4px;
        }
        .collaborator-chip {
            padding: 2px 8px;
            border-radius: 12px;
            color: white;
            font-size: 12px;
            font-weight: 500;
            text-shadow: 0 1px 1px rgba(0,0,0,0.2);
        }
        .connection-status {
            display: flex;
            align-items: center;
        }
        .status-indicator {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .status-indicator.connected {
            background-color: #4CAF50;
            color: white;
        }
        .status-indicator.disconnected {
            background-color: #f44336;
            color: white;
        }
        .code-editor {
            flex: 1;
            overflow: auto;
        }
        .editor-footer {
            padding: 4px 16px;
            background-color: #fafafa;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
        }
        .editor-info {
            display: flex;
            gap: 16px;
        }
        :host ::ng-deep .cm-editor {
            height: 100%;
            font-size: 14px;
        }
        :host ::ng-deep .cm-focused {
            outline: none;
        }
        :host ::ng-deep .cm-ySelectionInfo {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            color: white;
            position: absolute;
            z-index: 10;
        }
    `]
})

export class CodeEditorComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('editorRef', { static: true }) editorRef!: ElementRef;
    @Input() roomId: string = '';
    @Input() language: string = 'javascript';
    @Input() readOnly: boolean = false;
    @Output() editorStateChange = new EventEmitter<AppEditorState>();

    private view: EditorView | null = null;
    private ytext: Y.Text | null = null;
    private destroy$ = new Subject<void>();

    collaborators: CollaboratorInfo[] = [];
    isConnected: boolean = false;
    lineCount: number = 0;
    charCount: number = 0;

    constructor (
        private codeCompletionService: CodeCompletionService,
        private collaborationService: CollaborationService
    ) {
        console.log("Code Editor component called");
    }

    ngOnInit(): void {
        this.initializeEditor();
        this.setupCollaborationSubscriptions();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.cleanup();
    }

    ngAfterViewInit(): void {
        if(!this.editorRef) {
            console.error('editorRef is not available in ngAfterViewInit')
        }
    }

    private async initializeEditor(): Promise<void> {
        if (!this.roomId) {
            console.error('Room ID is required');
            return;
        }
        try {
            // Join collaboration room and get shared text
            this.collaborationService.joinRoom(this.roomId).pipe(takeUntil(this.destroy$)).subscribe(ytext => {
                this.ytext = ytext;
                this.createEditor();
            });
        } catch (error) {
            console.error('Failed to initialize editor', error);
        }
    }

    private createEditor(): void {
        if (!this.ytext) return;
        const extensions: Extension[] = [
            basicSetup,
            this.getLanguageExtension(),
            this.createCompletionExtension(),
            yCollab(this.ytext, this.collaborationService.userId),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    this.updateEditorStats();
                    this.emitEditorState();
                }
                if(update.selectionSet) {
                    this.updateCursor(update.view);
                }
            }),
            EditorView.editable.of(!this.readOnly)
        ];
        const state = EditorState.create({
            extensions
        });

        this.view = new EditorView({
            state,
            parent: this.editorRef.nativeElement
        });
        this.updateEditorStats();
    }

    private getLanguageExtension(): Extension {
        switch(this.language.toLowerCase()) {
            case 'javascript':
            case 'typescript':
                return javascript({ typescript: this.language === 'typescript' });
            default:
                return javascript();
        }
    }

    private createCompletionExtension(): Extension {
        const completionSource: CompletionSource = async (context: CompletionContext): Promise<CompletionResult | null> => {
            return this.getCompletions(context);
        };
        return autocompletion({
            override: [completionSource],
            activateOnTyping: true,
            maxRenderedOptions: 20
        });
    }

    private async getCompletions(context: CompletionContext): Promise<CompletionResult | null> {
        try {
            const doc = context.state.doc;
            const code = doc.toString();
            const cursorPos = context.pos;

            // Don't trigger completion for very short inputs or in strings/comments
            const word = context.matchBefore(/\w*/);
            if (!word || (word.from === word.to && !context.explicit)) {
                return null;
            }

            const response = await this.codeCompletionService.getCompletions({
                code,
                cursorPosition: cursorPos,
                language: this.language
            }).toPromise();

            if (!response?.success || !response.suggestions?.length) {
                return null;
            }

            return {
                from: word.from,
                options: response.suggestions.map((suggestion: any) => ({
                    label: suggestion.label,
                    detail: suggestion.detail,
                    info: suggestion.documentation,
                    apply: suggestion.insertText,
                    type: suggestion.kind,
                    boost: suggestion.sortText ? -parseInt(suggestion.sortText) : 0
                }))
            };
        } catch (error) {
            console.warn('Completion request failed: ', error);
            return null;
        }
    }

    private updateCursor(view: EditorView): void {
        const selection = view.state.selection.main;
        this.collaborationService.updateCursor(
            selection.head,
            selection.empty ? undefined : {
                anchor: selection.anchor,
                head: selection.head
            }
        );
    }

    private setupCollaborationSubscriptions(): void {
        this.collaborationService.collaborators$.pipe(takeUntil(this.destroy$)).subscribe((collaborators: any) => {
            this.collaborators = collaborators;
        });
        this.collaborationService.connectionStatus$.pipe(takeUntil(this.destroy$)).subscribe((isConnected: any) => {
            this.isConnected = isConnected;
        });
    }

    private updateEditorStats(): void {
        if (!this.view) return;

        const doc = this.view.state.doc;
        this.lineCount = doc.lines;
        this.charCount = doc.length;
    }

    private emitEditorState(): void {
        if (!this.view) return;

        const state: AppEditorState = {
            content: this.view.state.doc.toString(),
            cursorPosition: this.view.state.selection.main.head,
            language: this.language,
            readOnly: this.readOnly
        };
        this.editorStateChange.emit(state);
    }

    private cleanup(): void {
        if (this.view) {
            this.view.destroy();
            this.view = null;
        }
        this.collaborationService.leaveCurrentRoom();
    }

    // public methods for external control
    public getContent(): string {
        return this.view?.state.doc.toString() || '';
    }

    public setContent(content: string): void {
        if (!this.view) return;
        const transaction = this.view.state.update({
            changes: {
                from: 0,
                to: this.view.state.doc.length,
                insert: content
            }
        });
        this.view.dispatch(transaction);
    }

    public focus(): void {
        this.view?.focus();
    }
}