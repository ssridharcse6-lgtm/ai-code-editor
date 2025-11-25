import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, timeout } from 'rxjs';
import { CodeCompletionRequest, CodeCompletionResponse } from '../types/editor.types';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CodeCompletionService {
    private readonly baseUrl = environment.apiUrl;
    private readonly completionEndpoint = `${this.baseUrl}/api/complete`;
    private readonly requestTimeout = 10000;

    constructor(private http: HttpClient) {}

    getCompletions(request: CodeCompletionRequest): Observable<CodeCompletionResponse> {
        return this.http.post<CodeCompletionResponse>(this.completionEndpoint, request).pipe(
            timeout(this.requestTimeout),
            catchError(this.handleError)
        );
    }

    private handleError = (error: HttpErrorResponse): Observable<never> => {
        let errorMessage = 'An unknown error occurred';

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            errorMessage = `Error: ${error.error.message}`;
        } else {
            // Server side error
            switch (error.status) {
                case 400:
                    errorMessage = 'Invalid request format';
                    break;
                case 429:
                    errorMessage = 'Too many requests. Please try again later';
                    break;
                case 500:
                    errorMessage = 'Server error. Please try again later';
                    break;
                case 0:
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = `Server returned code ${error.status}: ${error.error?.error || error.message}`;
            }
        }
        console.error(`Code coompletion error:`, error);
        return throwError(() => new Error(errorMessage));
    }
}
