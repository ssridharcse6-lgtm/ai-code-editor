import { GoogleGenerativeAI } from '@google/generative-ai';
import { CompletionRequest, CompletionResponse, CodeSuggestion, CompletionKind } from '../types/api.types';

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async getCodeCompletions(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const prompt = this.buildPrompt(request);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const suggestions = this.parseGeminiResponse(response.text());

      return {
        suggestions,
        success: true
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        suggestions: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private buildPrompt(request: CompletionRequest): string {
    const { code, cursorPosition, language } = request;
    const beforeCursor = code.substring(0, cursorPosition);
    const afterCursor = code.substring(cursorPosition);

    return `
You are an expert ${language} code completion assistant. Given the code context, provide intelligent code completion suggestions.

Current code context:
\`\`\`${language}
${beforeCursor}<CURSOR>${afterCursor}
\`\`\`

Cursor is at position ${cursorPosition}. The text before cursor is:
"${beforeCursor.slice(-50)}"

Please provide code completion suggestions in JSON format with the following structure:
{
  "suggestions": [
    {
      "label": "suggestion text",
      "insertText": "text to insert",
      "detail": "brief description",
      "documentation": "detailed explanation",
      "kind": "function|method|variable|class|interface|keyword|snippet"
    }
  ]
}

Guidelines:
1. Provide 3-5 relevant suggestions
2. Consider the current context and partial typing
3. Include appropriate language constructs (functions, methods, variables, etc.)
4. Ensure suggestions are syntactically correct
5. Prioritize most likely completions first

Respond only with valid JSON, no additional text.
`;
  }

  private parseGeminiResponse(responseText: string): CodeSuggestion[] {
    try {
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
     
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid suggestions format');
      }

      return parsed.suggestions.map((suggestion: any) => ({
        label: suggestion.label || '',
        detail: suggestion.detail || '',
        documentation: suggestion.documentation || '',
        insertText: suggestion.insertText || suggestion.label || '',
        kind: this.mapCompletionKind(suggestion.kind),
        sortText: suggestion.sortText || suggestion.label || ''
      }));
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      // Fallback: try to extract simple completions
      return this.extractFallbackSuggestions(responseText);
    }
  }

  private mapCompletionKind(kind: string): CompletionKind {
    const kindMap: Record<string, CompletionKind> = {
      'function': CompletionKind.Function,
      'method': CompletionKind.Method,
      'variable': CompletionKind.Variable,
      'class': CompletionKind.Class,
      'interface': CompletionKind.Interface,
      'keyword': CompletionKind.Keyword,
      'snippet': CompletionKind.Snippet,
      'property': CompletionKind.Property,
      'field': CompletionKind.Field,
      'constructor': CompletionKind.Constructor
    };

    return kindMap[kind?.toLowerCase()] || CompletionKind.Text;
  }

  private extractFallbackSuggestions(text: string): CodeSuggestion[] {
    // Simple fallback to extract potential code suggestions
    const codeBlocks = text.match(/`([^`]+)`/g) || [];
    return codeBlocks.slice(0, 3).map((block, index) => ({
      label: block.replace(/`/g, '').trim(),
      insertText: block.replace(/`/g, '').trim(),
      detail: 'AI suggestion',
      kind: CompletionKind.Text,
      sortText: `${index}`
    }));
  }
}
