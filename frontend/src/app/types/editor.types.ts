export interface CodeCompletionRequest {
    code: string;
    cursorPosition: number;
    language: string;
    fileName?: string;
}

export interface CodeCompletionResponse {
    suggestions: CodeSuggestion[];
    success: boolean;
    error?: string;
}

export interface CodeSuggestion {
    label: string;
    detail?: string;
    documentation?: string;
    insertText: string;
    kind: string;
    sortText?: string;
}

export interface EditorState {
    content: string;
    cursorPosition: number;
    language: string;
    readOnly: boolean;
}

export interface CollaboratorInfo {
    id: string;
    name: string;
    color: string;
    cursor?: {
        position: number;
        selection?: {
            anchor: number;
            head: number;
        };
    };
}

export interface RoomInfo {
    id: string;
    participantCount: number;
    createdAt: string;
    lastActivity: string;
}
