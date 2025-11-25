export interface CompletionRequest {
    code: string;
    cursorPosition: number;
    language: string;
    fileName?: string;
}

export interface CompletionResponse {
    suggestions: CodeSuggestion[];
    success: boolean;
    error?: string;
}

export interface CodeSuggestion {
    label: string;
    detail?: string;
    documentation?: string;
    insertText: string;
    kind: CompletionKind;
    sortText?: string;
}

export enum CompletionKind {
    Method = 'method',
    Function = 'function',
    Constructor = "constructor",
    Field = 'field',
    Variable = 'variable',
    Class = 'class',
    Interface = 'interface',
    Module = 'module',
    Property = 'property',
    Unit = 'unit',
    Value = 'value',
    Enum = 'enum',
    Keyword = 'keyword',
    Snippet = 'snippet',
    Text = 'text',
    Color = 'color',
    File = 'file',
    Reference = 'reference',
    Folder = 'folder'
}
